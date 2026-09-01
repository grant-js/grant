#!/usr/bin/env node
/**
 * Reference app — the scalar-configured entry point.
 *
 * This is the layer an adopter **replaces**, not forks. Per ADR 0005 the constructs
 * in `lib/` accept CDK resource interfaces, so composing against existing
 * infrastructure means writing your own version of this file — importing your VPC
 * with `Vpc.fromVpcAttributes(...)` and your existing certificate — while staying on
 * upstream `lib/`. Forking the library means porting every later fix by hand.
 *
 * Two stacks, because CloudFront is global but the ACM certificate it serves is
 * pinned to `us-east-1`. Splitting the certificate out is what keeps the platform
 * free to live in a region chosen for latency instead of for CloudFront.
 *
 *   cdk deploy --all \
 *     -c appUrl=https://grant.example.com \
 *     -c zoneName=example.com \
 *     -c hostedZoneId=Z123456ABCDEFG \
 *     -c account=123456789012 \
 *     -c region=eu-central-1
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, Stack } from 'aws-cdk-lib';
import { Certificate, type ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

import { loadTargetConfig } from '../lib/config/env-file';
import { ConfigurationError } from '../lib/config/errors';
import { assertConcreteEnv, validateAppUrl, validateCertificateArn } from '../lib/config/validate';
import { EdgeCertificate } from '../lib/edge/certificate';
import { GrantPlatform } from '../lib/grant-platform';

/** CloudFront reads its certificate only from here. */
const CERTIFICATE_REGION = 'us-east-1';

const app = new App();

function required(key: string): string {
  const value = app.node.tryGetContext(key) as string | undefined;
  if (!value) {
    throw new ConfigurationError(
      `Missing required context "${key}".\n` +
        '  cdk deploy --all -c appUrl=https://grant.example.com -c zoneName=example.com \\\n' +
        '    -c hostedZoneId=Z123456ABCDEFG -c account=123456789012 -c region=eu-central-1'
    );
  }
  return value;
}

function optional(key: string): string | undefined {
  return app.node.tryGetContext(key) as string | undefined;
}

const appUrl = required('appUrl');
const zoneName = required('zoneName');
const hostedZoneId = required('hostedZoneId');
const certificateArn = optional('certificateArn');

/**
 * Throwaway environment: teardown may destroy the data.
 *
 * Off by default, and it also disables deletion protection when set — which is why
 * it is an explicit opt-in rather than inferred from anything else.
 *
 *   cdk deploy --all -c ephemeral=true ...
 */
const ephemeral = optional('ephemeral') === 'true';

/**
 * Configuration file for this target — the AWS analogue of the Helm chart's
 * `config:` block. Defaults to `deploy/aws/.env`; override with `-c envFile=...`.
 *
 * Absent is fine: the stack then deploys on `AWS_TARGET_ENV_DEFAULTS` alone, exactly
 * as it did before this file existed. Present, its keys layer *over* those defaults,
 * and explicit `-c` context still wins over both — the same precedence Helm gives
 * `--set` over `values.yaml`.
 */
const DEFAULT_ENV_FILE = join(dirname(fileURLToPath(import.meta.url)), '../.env');
const envFilePath = resolve(optional('envFile') ?? DEFAULT_ENV_FILE);
const targetConfig = loadTargetConfig(
  envFilePath,
  (p) => readFileSync(p, 'utf-8'),
  (p) => existsSync(p)
);

/**
 * Names only — never values. These are not synthesized into the template at all;
 * `scripts/put-secrets.mjs` writes them to the platform secret after deploy, and the
 * application resolves them through `ISecretResolver` within its TTL.
 */
const pendingSecretKeys = Object.keys(targetConfig.secrets);
if (pendingSecretKeys.length > 0) {
  console.error(
    `[grant] ${pendingSecretKeys.length} secret(s) in ${envFilePath} are not part of this ` +
      `template (${pendingSecretKeys.join(', ')}). Apply with: pnpm --filter grant-aws-deploy put-secrets`
  );
}

const { hostname } = validateAppUrl(appUrl);

// Concrete, never agnostic. CDK only generates cross-region plumbing when it can see
// the two environments differ; left as tokens it silently emits an ordinary
// Fn::ImportValue, which synthesizes cleanly and fails at deploy.
// No placeholder fallback: one would make this assertion unreachable, and an
// unreachable guard against a silent deploy failure is worse than none. `pnpm synth`
// passes both explicitly so the committed template stays deterministic; `cdk deploy`
// gets them from the CLI's credentials; anything else fails here with instructions.
const { account, region } = assertConcreteEnv('GrantPlatform', {
  account: optional('account') ?? process.env.CDK_DEFAULT_ACCOUNT,
  region: optional('region') ?? process.env.CDK_DEFAULT_REGION,
});

const zoneAttributes = { hostedZoneId, zoneName };

let certificate: ICertificate;

if (certificateArn) {
  // Lexical and cheap: fromCertificateArn returns a token that validates nothing, and
  // a certificate outside us-east-1 is the most common first-deploy failure.
  validateCertificateArn(certificateArn);
  const importStack = new Stack(app, 'GrantPlatform', {
    env: { account, region },
    crossRegionReferences: true,
    description: 'Grant platform — AWS serverless target',
  });
  certificate = Certificate.fromCertificateArn(importStack, 'Certificate', certificateArn);
  buildPlatform(importStack, certificate);
} else {
  // Its own stack, in us-east-1, regardless of where the platform lives.
  const certificateStack = new Stack(app, 'GrantCertificate', {
    env: { account, region: CERTIFICATE_REGION },
    crossRegionReferences: true,
    description: 'Grant platform — CloudFront certificate (must be us-east-1)',
  });

  certificate = new EdgeCertificate(certificateStack, 'Edge', {
    hostname,
    hostedZone: HostedZone.fromHostedZoneAttributes(certificateStack, 'HostedZone', zoneAttributes),
  }).certificate;

  const platformStack = new Stack(app, 'GrantPlatform', {
    env: { account, region },
    crossRegionReferences: true,
    description: 'Grant platform — AWS serverless target',
  });
  buildPlatform(platformStack, certificate);
}

function buildPlatform(stack: Stack, cert: ICertificate): void {
  new GrantPlatform(stack, 'Grant', {
    appUrl,
    database: { destroyOnRemoval: ephemeral },
    // The uploads bucket defaults to Retain, which is right for user data and wrong
    // for a throwaway environment: teardown would leave a bucket behind and break the
    // property `ephemeral` exists to provide. The cache table already defaults to
    // Delete, so only this one needs saying.
    storage: { destroyOnRemoval: ephemeral },
    // The web app is what makes the deployment a platform rather than docs plus an
    // API. Built from source; `apps/web/.next/static` must exist, so run
    // `pnpm --filter grant-web build` first — the same contract the docs site has.
    web: {},
    env: {
      // The config file first, so explicit `-c` context below still wins.
      ...targetConfig.env,
      // Email is opt-in per deployment because SES needs a verified identity that CDK
      // cannot create for you. Set here rather than in the target defaults so a fresh
      // deploy without a verified domain still boots — it falls back to `console`.
      ...(optional('emailFrom')
        ? {
            EMAIL_PROVIDER: 'ses',
            EMAIL_FROM: optional('emailFrom') as string,
            EMAIL_SES_REGION: region,
          }
        : {}),
      // Not secret; the client secret goes to the platform secret, never here.
      ...(optional('githubClientId')
        ? { GITHUB_CLIENT_ID: optional('githubClientId') as string }
        : {}),
      ...(optional('githubClientId')
        ? {
            GITHUB_CALLBACK_URL: `${appUrl}/api/auth/github/callback`,
            GITHUB_PROJECT_CALLBACK_URL: `${appUrl}/api/auth/project/callback`,
          }
        : {}),
    },
    dns: {
      // fromHostedZoneAttributes, not fromLookup: a lookup resolves against live
      // account state at synth time and would make the committed template a function
      // of whichever account last ran synth. ADR 0005.
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', zoneAttributes),
      certificate: cert,
    },
  });
}
