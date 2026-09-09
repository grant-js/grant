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
 *
 * Add `-c dbUrlSecretArn=...` to serve against a database you already run instead of
 * an Aurora cluster this stack creates; see `buildDatabase` below for the rest of the
 * bring-your-own flags.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Certificate, type ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

import { loadTargetConfig } from '../lib/config/env-file';
import { ConfigurationError } from '../lib/config/errors';
import type { GrantEnv, GrantPlatformProps, ObservabilityProps } from '../lib/config/props';
import {
  assertConcreteEnv,
  validateAppUrl,
  validateCertificateArn,
  validateSecretArn,
  validateSesIdentityArn,
} from '../lib/config/validate';
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

/**
 * Bring your own PostgreSQL, in the two shapes this app can express.
 *
 *   -c dbUrlSecretArn=arn:aws:secretsmanager:<region>:<account>:secret:<name>-<suffix>
 *   -c vpcId=vpc-... -c vpcAzs=eu-central-1a,eu-central-1b \
 *     -c vpcPrivateSubnetIds=subnet-...,subnet-...
 *   -c dbSecurityGroupId=sg-...
 *
 * With the ARN alone the functions run outside a VPC and reach a routable database
 * directly, which is what removes the NAT gateway — the largest fixed cost in this
 * target — and is the deployment most adopters bringing a managed Postgres have. Add
 * the VPC flags and they run inside the VPC the database already lives in, where the
 * deploy-time Fargate migration is available again because a task has subnets.
 *
 * The CDK CLI ignores an unrecognized `-c` silently, so every combination that would
 * quietly do nothing is refused instead. A flag with no effect is how someone deploys
 * an Aurora cluster believing they brought their own database.
 */
const dbUrlSecretArn = optional('dbUrlSecretArn');
const vpcId = optional('vpcId');
const dbSecurityGroupId = optional('dbSecurityGroupId');

const BROUGHT_DATABASE_KEYS = ['vpcId', 'vpcAzs', 'vpcPrivateSubnetIds', 'dbSecurityGroupId'];

if (dbUrlSecretArn) {
  // Lexical and cheap, exactly as the certificate ARN is: a dynamic reference is
  // resolved by CloudFormation during deploy, so a secret in the wrong account or
  // region fails while creating the platform secret rather than here.
  validateSecretArn(dbUrlSecretArn, { account, region });
} else {
  const ignored = BROUGHT_DATABASE_KEYS.filter((key) => optional(key));
  if (ignored.length > 0) {
    throw new ConfigurationError(
      `Without -c dbUrlSecretArn nothing reads ${ignored.join(', ')}: this app deploys ` +
        'the Aurora cluster it creates, in a VPC it creates.\n' +
        'To put a cluster this stack owns inside a VPC you already have, pass ' +
        '`network.vpc` from your own bin/ — that composition is what ADR 0005 keeps open.'
    );
  }
}

if (dbSecurityGroupId && !vpcId) {
  throw new ConfigurationError(
    'dbSecurityGroupId needs -c vpcId. Without one this app builds a VPC of its own and ' +
      'then writes an ingress rule whose source is a security group in it and whose target ' +
      'is a group in yours — and CloudFormation refuses a rule spanning two VPCs, halfway ' +
      'through the deploy.\n' +
      'Either name the VPC the database lives in, or drop the flag and open the group ' +
      'yourself.'
  );
}

/** Comma-separated ids, as the AWS console and CLI both print them. */
function requiredList(key: string): string[] {
  const values = (optional(key) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (values.length === 0) {
    throw new ConfigurationError(
      `Missing required context "${key}". Importing a VPC by attributes takes all three:\n` +
        '  -c vpcId=vpc-0123456789abcdef0 \\\n' +
        '    -c vpcAzs=eu-central-1a,eu-central-1b \\\n' +
        '    -c vpcPrivateSubnetIds=subnet-0123456789abcdef0,subnet-0123456789abcdef1\n' +
        'CDK cannot discover them without a lookup, and a lookup would make the committed ' +
        'template a function of whichever account last synthesized.'
    );
  }
  return values;
}

/**
 * The private subnets are named rather than discovered because the API function, the
 * jobs function and the migration task all select `PRIVATE_WITH_EGRESS`, and an
 * imported VPC knows only what it is told. They must have a route out: the functions
 * reach SES, GitHub and arbitrary webhook URLs, and the migration pulls an image.
 *
 * CDK warns at synth that no route table id was supplied for them. Nothing here reads
 * one: the gateway endpoints that would are created only for a VPC `Network` owns,
 * because `addGatewayEndpoint` on an imported VPC attaches to route tables this stack
 * cannot see.
 */
const vpcAttributes = vpcId
  ? {
      vpcId,
      availabilityZones: requiredList('vpcAzs'),
      privateSubnetIds: requiredList('vpcPrivateSubnetIds'),
    }
  : undefined;

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

/**
 * The container environment, in three layers — lowest precedence first:
 *
 *   1. values derived from other settings
 *   2. the config file
 *   3. explicit `-c` context
 *
 * Layer 1 exists because three keys have defaults in `@grantjs/env` that are right
 * for local development and wrong for any real deployment: both GitHub callbacks
 * point at localhost, and SES points at us-east-1. Before the config file existed,
 * `-c` context set them implicitly, so configuring GitHub or SES *through the file*
 * would have silently inherited the local defaults — and both failures surface far
 * from here, at GitHub's callback check and as an SES identity that "does not exist"
 * in a region it was never verified in.
 *
 * They are a base layer rather than an override, so an explicit value in the file or
 * on the command line still wins without special-casing either.
 */
function buildEnv(): GrantEnv {
  const fromContext: GrantEnv = {
    // Email is opt-in per deployment because SES needs a verified identity that CDK
    // cannot create for you, so a fresh deploy without one still boots on `console`.
    ...(optional('emailFrom')
      ? { EMAIL_PROVIDER: 'ses', EMAIL_FROM: optional('emailFrom') as string }
      : {}),
    // Not secret; the client secret goes to the platform secret, never here.
    ...(optional('githubClientId')
      ? { GITHUB_CLIENT_ID: optional('githubClientId') as string }
      : {}),
  };

  const clientId = fromContext.GITHUB_CLIENT_ID ?? targetConfig.env.GITHUB_CLIENT_ID;
  const emailProvider = fromContext.EMAIL_PROVIDER ?? targetConfig.env.EMAIL_PROVIDER;

  const derived: GrantEnv = {
    ...(clientId
      ? {
          GITHUB_CALLBACK_URL: `${appUrl}/api/auth/github/callback`,
          GITHUB_PROJECT_CALLBACK_URL: `${appUrl}/api/auth/project/callback`,
        }
      : {}),
    // SES is regional and an identity is verified per region. The stack's own region
    // is the only default that can be right by construction.
    ...(emailProvider === 'ses' ? { EMAIL_SES_REGION: region } : {}),
  };

  return { ...derived, ...targetConfig.env, ...fromContext };
}

/**
 * The SES identity the platform is permitted to send as.
 *
 * `-c sesIdentityArn` wins; otherwise the domain-identity ARN is composed from
 * `-c emailFrom`. Composing it *here* rather than in `lib/` is ADR 0005: an ARN
 * derived from a mail address is a guess about how an adopter verified their identity,
 * and the reference app is the layer allowed to make convenient guesses.
 *
 * The guess is the domain, because that is what a real deployment verifies —
 * `no-reply@example.com` sends from a verified `example.com` far more often than from
 * a mailbox identity of its own. An adopter who verified the address instead passes
 * `-c sesIdentityArn=...:identity/no-reply@example.com` and this composition is
 * skipped entirely.
 *
 * The region is the stack's, matching the `EMAIL_SES_REGION` derived in `buildEnv` —
 * SES identities are verified per region, and an ARN naming another one produces a
 * grant for an identity that does not exist there.
 */
function buildEmail(env: GrantEnv): Pick<GrantPlatformProps, 'email'> {
  const explicit = optional('sesIdentityArn');
  if (explicit) {
    // Lexical, and for the same reason certificateArn is: it lands in a policy
    // `Resource`, where a wrong one deploys cleanly and fails on the first send.
    validateSesIdentityArn(explicit);
    return { email: { sesIdentityArn: explicit } };
  }

  const from = env.EMAIL_FROM;
  if (env.EMAIL_PROVIDER !== 'ses' || !from) return {};

  const domain = from.split('@')[1];
  if (!domain) {
    throw new Error(
      `EMAIL_FROM is not an email address: ${from}\n` +
        'The SES identity ARN is composed from its domain. Pass a full address, or ' +
        'name the identity outright with -c sesIdentityArn=...'
    );
  }

  return { email: { sesIdentityArn: `arn:aws:ses:${region}:${account}:identity/${domain}` } };
}

/**
 * The database, and the network that follows from it.
 *
 * `database` is spread conditionally rather than passed unconditionally, and that is
 * the whole of what makes the bring-your-own topologies reachable from here: the two
 * props are mutually exclusive at synth, so an unconditional `database: {}` meant
 * every `-c dbUrlSecretArn` deploy failed on "Pick one database" instead.
 */
function buildDatabase(
  stack: Stack
): Pick<GrantPlatformProps, 'database' | 'databaseUrl' | 'network'> {
  if (!dbUrlSecretArn) return { database: { destroyOnRemoval: ephemeral } };

  // Rendered as a {{resolve:secretsmanager:...}} dynamic reference inside the platform
  // secret: present at deploy time, absent from the template. Never `unsafePlainText`,
  // which would put the connection string and its password in cdk.out and in every
  // copy of the template.
  const databaseUrl = SecretValue.secretsManager(dbUrlSecretArn);
  if (!vpcAttributes) return { databaseUrl };

  return {
    databaseUrl,
    network: {
      // fromVpcAttributes, not fromLookup — the same rule the hosted zone follows
      // below. A lookup resolves against live account state at synth time and caches
      // into cdk.context.json, which would make the committed template a function of
      // whichever account last ran synth. ADR 0005.
      vpc: Vpc.fromVpcAttributes(stack, 'Vpc', vpcAttributes),
      ...(dbSecurityGroupId
        ? {
            // Mutable, which `fromSecurityGroupId` is by default and which is what
            // makes CDK emit the ingress rule against a group this stack does not own.
            // With `{ mutable: false }` the call is dropped silently and the migration
            // fails to connect. See NetworkProps.databaseSecurityGroup.
            databaseSecurityGroup: SecurityGroup.fromSecurityGroupId(
              stack,
              'BroughtDatabase',
              dbSecurityGroupId
            ),
          }
        : {}),
    },
  };
}

/**
 * Where the origin-verify alarm sends a breach.
 *
 * The topic and its subscription are composed here, never in `lib/` (ADR 0005): a
 * construct library that created a mailbox would be one an adopter has to fork to
 * change the destination. Omit `-c alarmEmail` and the alarm is still created and still
 * evaluates — it notifies nobody, which is a control with a history rather than no
 * control.
 *
 * An email subscription needs confirming: AWS sends a confirmation link on first
 * deploy, and until it is clicked the subscription is `PendingConfirmation` and
 * delivers nothing. That is a manual step no template can take, and worth knowing
 * before treating the alarm as wired.
 */
function buildObservability(stack: Stack): { observability?: ObservabilityProps } {
  const alarmEmail = optional('alarmEmail');
  if (!alarmEmail) return {};

  const topic = new Topic(stack, 'Alarms', {
    displayName: 'Grant platform alarms',
  });
  topic.addSubscription(new EmailSubscription(alarmEmail));

  return { observability: { alarmTopic: topic } };
}

function buildPlatform(stack: Stack, cert: ICertificate): void {
  const env = buildEnv();

  new GrantPlatform(stack, 'Grant', {
    appUrl,
    ...buildDatabase(stack),
    // The uploads bucket defaults to Retain, which is right for user data and wrong
    // for a throwaway environment: teardown would leave a bucket behind and break the
    // property `ephemeral` exists to provide. The cache table already defaults to
    // Delete, so only this one needs saying.
    storage: { destroyOnRemoval: ephemeral },
    // The web app is what makes the deployment a platform rather than docs plus an
    // API. Built from source; `apps/web/.next/static` must exist, so run
    // `pnpm --filter grant-web build` first — the same contract the docs site has.
    web: {},
    env,
    ...buildEmail(env),
    ...buildObservability(stack),
    dns: {
      // fromHostedZoneAttributes, not fromLookup: a lookup resolves against live
      // account state at synth time and would make the committed template a function
      // of whichever account last ran synth. ADR 0005.
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'HostedZone', zoneAttributes),
      certificate: cert,
    },
  });
}
