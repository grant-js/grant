/**
 * The props boundary, asserted against a synthesized template rather than a validator.
 *
 * `env-boundary-parity.test.ts` calls `assertConfigurableEnv` and
 * `assertConfigurableSecrets` directly, which proves the rules agree but says nothing
 * about whether `GrantPlatform` still calls them. That gap is not hypothetical: gate 4
 * mutation-tested the story and found that deleting
 * `assertConfigurableEnv(props.web?.env, 'web.env')` left 430 of 430 tests green,
 * because the only test naming `web.env` asserted the *string label* passed to the
 * validator (finding M-2). It is the same shape as slice 2's finding F-B, where an
 * assertion about the API origin passed with the API origin removed entirely.
 *
 * So every test here builds a real `GrantPlatform` and either reads the template or
 * expects construction to throw. Each one fails if the corresponding call site in
 * `grant-platform.ts` is deleted, which is the property that makes it worth its
 * runtime.
 */
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';
import { RESOLVER_SECRET_KEYS } from './env-file';
import type { GrantPlatformProps } from './props';

const BYO_ARN = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf';

/** Images are caller-supplied for the reason `byo-database.test.ts` records: a
 * `DockerImageAsset` fingerprints the whole build context and times the suite out. */
function build(overrides: Partial<GrantPlatformProps> = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  const image = DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
    tagOrDigest: 'test',
  });
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
      certificate: Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
      ),
    },
    databaseUrl: SecretValue.secretsManager(BYO_ARN),
    api: { image },
    web: { image },
    migration: { enabled: false },
    ...overrides,
  });
  return { template: Template.fromStack(stack), platform };
}

/** Every environment-variable map on every function in the synthesized template. */
function lambdaEnvironments(template: Template): Record<string, string>[] {
  return Object.values(template.findResources('AWS::Lambda::Function')).map(
    (fn) => (fn.Properties?.Environment?.Variables ?? {}) as Record<string, string>
  );
}

const SENTINEL = 'sentinel-must-never-reach-a-function';

describe('a resolver-backed secret never becomes a Lambda environment variable', () => {
  it.each(RESOLVER_SECRET_KEYS)('%s is absent from every function on a clean build', (key) => {
    // The baseline. If this fails, something started defaulting the key onto the
    // functions and the refusals below are guarding a door that is already open.
    for (const env of lambdaEnvironments(build().template)) {
      expect(env, `${key} reached a function's environment`).not.toHaveProperty(key);
    }
  });

  it.each(RESOLVER_SECRET_KEYS)('passing %s in props.env fails the synth', (key) => {
    // Fails if `assertConfigurableEnv(props.env, 'env')` is removed, and fails if
    // RESOLVER_SECRET_KEYS is dropped from REFUSED_AS_ENV — which is how these two
    // keys synthesized as plaintext for the whole story. Gate 4, finding C-1.
    expect(() => build({ env: { [key]: SENTINEL } })).toThrow(/cannot be passed as configuration/);
  });

  it.each(RESOLVER_SECRET_KEYS)('passing %s in props.web.env fails the synth', (key) => {
    // The mutation that left 430/430 green. Gate 4, finding M-2.
    expect(() => build({ web: { env: { [key]: SENTINEL } } as GrantPlatformProps['web'] })).toThrow(
      /^web\.env:/
    );
  });

  it('routes a legitimately-supplied secret to the platform secret, not to a function', () => {
    // The positive control the refusals need: `secrets` is the supported path, so it
    // must actually work, or the error messages point somewhere useless.
    const { template } = build({
      secrets: { GITHUB_CLIENT_SECRET: SecretValue.secretsManager('github/oauth') },
    });

    for (const env of lambdaEnvironments(template)) {
      expect(env).not.toHaveProperty('GITHUB_CLIENT_SECRET');
    }

    const templates = Object.values(template.findResources('AWS::SecretsManager::Secret')).map(
      (s) => s.Properties?.GenerateSecretString?.SecretStringTemplate
    );
    expect(JSON.stringify(templates)).toContain('GITHUB_CLIENT_SECRET');
  });
});

describe('props.secrets refuses the keys the stack owns', () => {
  it('refuses ORIGIN_VERIFY_SECRET, which collides with the generated value', () => {
    // Accepted for the whole story while both other boundaries refused it by name.
    // It is the only control in front of an `AuthType: NONE` function URL. Gate 4,
    // finding H-1. Fails if `assertConfigurableSecrets(props.secrets, ...)` is removed.
    expect(() =>
      build({ secrets: { ORIGIN_VERIFY_SECRET: SecretValue.unsafePlainText('attacker-known') } })
    ).toThrow(/generated by the stack/);
  });

  it('refuses a DB_URL that would override the validated one', () => {
    // `PlatformSecret` spreads `extraEnv` after the composed `DB_URL`, so this reached
    // the same field having passed none of the scheme or quote checks — and an empty
    // string reintroduced F4 through a different door. Gate 4, finding M-1.
    expect(() =>
      build({ secrets: { DB_URL: SecretValue.unsafePlainText('postgresql://u:pw@h:5432/d') } })
    ).toThrow(/composed by the stack/);
  });

  it('still renders the supplied databaseUrl as a dynamic reference', () => {
    // What the refusal protects: the plaintext never enters the template.
    const { template } = build();
    const rendered = JSON.stringify(template.findResources('AWS::SecretsManager::Secret'));

    expect(rendered).toContain('{{resolve:secretsmanager:');
    expect(rendered).not.toContain('hunter2');
  });
});
