import type { ISecretResolver } from '@grantjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Credentials resolve through `ISecretResolver` on every target.
 *
 * The AWS target refused seventeen credential-shaped keys because a Lambda environment
 * variable is plaintext in the CloudFormation template, in the function configuration
 * and in `cdk.out` on disk. The refusal was honest and it was a capability gap: Mailgun,
 * S3 with static keys and a password-protected Redis were all undeployable there.
 *
 * These cases are the ones that decide whether widening the set is safe rather than
 * merely convenient: does an env-configured deployment behave identically, does a blank
 * secret blank a working credential, and does a resolver that cannot answer stop the
 * boot instead of quietly producing an unconfigured adapter.
 */

const BASE_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  STORAGE_PROVIDER: 'local',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
  // Pinned empty so the repo's own `.env` cannot make a case pass for the wrong reason.
  MAILGUN_API_KEY: '',
  MAILJET_API_KEY: '',
  MAILJET_SECRET_KEY: '',
  SMTP_PASSWORD: '',
  REDIS_PASSWORD: '',
  SECURITY_API_KEY: '',
  STORAGE_S3_ACCESS_KEY_ID: '',
  STORAGE_S3_SECRET_ACCESS_KEY: '',
  CACHE_DYNAMODB_ACCESS_KEY_ID: '',
  CACHE_DYNAMODB_SECRET_ACCESS_KEY: '',
  JOBS_AWS_ACCESS_KEY_ID: '',
  JOBS_AWS_SECRET_ACCESS_KEY: '',
  EMAIL_SES_CLIENT_SECRET: '',
};

/**
 * A resolver backed by a fixed map, as the AWS one is backed by a secret payload.
 *
 * Normalizes `''` to `undefined`, which is what both shipped resolvers do.
 */
function resolverWith(values: Record<string, string | undefined>): ISecretResolver {
  return { resolve: vi.fn(async (name: string) => values[name] || undefined) };
}

/**
 * A resolver that returns whatever the payload holds, including `''`.
 *
 * Deliberately *less* well-behaved than `EnvSecretResolver` and
 * `AwsSecretsManagerSecretResolver`, both of which normalize empty to `undefined`. The
 * overlay's own guard is what has to hold if a future implementation does not — and a
 * fake that normalizes first cannot test that guard at all. It went unnoticed until a
 * mutation weakening `!value` to `value === undefined` passed every case here.
 */
function rawResolverWith(values: Record<string, string | undefined>): ISecretResolver {
  return { resolve: vi.fn(async (name: string) => values[name]) };
}

/** Fresh modules per case: `config` is built once at import from `process.env`. */
async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...env })) {
    vi.stubEnv(key, value);
  }
  return import('@/config');
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the overlay writes resolved credentials into config', () => {
  it('lands every routed key in the field its adapter reads', async () => {
    // The enumerated table, exercised end to end. Each of these is a field some adapter
    // factory reads at construction — an entry that wrote to the wrong path would be
    // invisible until an adapter failed to authenticate against a live service.
    const { config, resolveCredentials, RESOLVABLE_CREDENTIAL_KEYS } = await load();

    const secrets = Object.fromEntries(
      RESOLVABLE_CREDENTIAL_KEYS.map((key) => [key, `resolved:${key}`])
    );
    const summary = await resolveCredentials(resolverWith(secrets));

    expect(summary.resolved).toEqual([...RESOLVABLE_CREDENTIAL_KEYS]);
    expect(config.email.mailgun.apiKey).toBe('resolved:MAILGUN_API_KEY');
    expect(config.email.mailjet.secretKey).toBe('resolved:MAILJET_SECRET_KEY');
    expect(config.email.smtp.password).toBe('resolved:SMTP_PASSWORD');
    expect(config.email.ses.clientSecret).toBe('resolved:EMAIL_SES_CLIENT_SECRET');
    expect(config.redis.password).toBe('resolved:REDIS_PASSWORD');
    expect(config.security.apiKey).toBe('resolved:SECURITY_API_KEY');
    expect(config.storage.s3.accessKeyId).toBe('resolved:STORAGE_S3_ACCESS_KEY_ID');
    expect(config.storage.s3.secretAccessKey).toBe('resolved:STORAGE_S3_SECRET_ACCESS_KEY');
    expect(config.cache.dynamodb.accessKeyId).toBe('resolved:CACHE_DYNAMODB_ACCESS_KEY_ID');
    expect(config.cache.dynamodb.secretAccessKey).toBe('resolved:CACHE_DYNAMODB_SECRET_ACCESS_KEY');
    expect(config.jobs.aws.accessKeyId).toBe('resolved:JOBS_AWS_ACCESS_KEY_ID');
    expect(config.jobs.aws.secretAccessKey).toBe('resolved:JOBS_AWS_SECRET_ACCESS_KEY');
  });

  it('routes thirteen keys, and no more', async () => {
    // Diffed by eye against CREDENTIAL_KEYS in deploy/aws/lib/config/env-file.ts:
    // seventeen there, thirteen here, four deliberately absent. If this number moves,
    // slice 8's list has to move with it — and if it moved by accident, this is where
    // that shows up rather than in a template review.
    const { RESOLVABLE_CREDENTIAL_KEYS } = await load();

    expect(RESOLVABLE_CREDENTIAL_KEYS).toHaveLength(13);
    expect(RESOLVABLE_CREDENTIAL_KEYS).not.toContain('DB_GRANT_ROLE_URL');
    expect(RESOLVABLE_CREDENTIAL_KEYS).not.toContain('POSTGRES_PASSWORD');
    expect(RESOLVABLE_CREDENTIAL_KEYS).not.toContain('E2E_DB_URL');
    expect(RESOLVABLE_CREDENTIAL_KEYS).not.toContain('E2E_REDIS_PASSWORD');
  });

  it('leaves DB_GRANT_ROLE_URL alone, because it is a superuser URL read elsewhere', async () => {
    // `@grantjs/database` reads it during a migration, outside any composition root, so
    // an overlay here would write a value nothing reads while implying it was routed.
    const { resolveCredentials } = await load();
    const resolver = resolverWith({ DB_GRANT_ROLE_URL: 'postgres://root:pw@db/grant' });

    const summary = await resolveCredentials(resolver);

    expect(summary.resolved).toEqual([]);
    expect(resolver.resolve).not.toHaveBeenCalledWith('DB_GRANT_ROLE_URL');
  });
});

describe('the environment-backed path is unchanged', () => {
  it('keeps an env-supplied credential when the resolver has nothing', async () => {
    // Docker and Kubernetes default to SECRETS_PROVIDER=env. Their behaviour must not
    // move at all: this is the case that says so.
    const { config, resolveCredentials } = await load({ MAILGUN_API_KEY: 'from-the-env' });

    const summary = await resolveCredentials(resolverWith({}));

    expect(config.email.mailgun.apiKey).toBe('from-the-env');
    expect(summary.resolved).toEqual([]);
  });

  it('does not blank a working credential when the secret payload holds an empty value', async () => {
    // The dangerous shape. A secret written with a key present but empty would
    // otherwise turn a configured adapter into an unconfigured one at the next boot,
    // silently — a mail provider that stops sending rather than one that fails loudly.
    //
    // Uses the raw resolver on purpose: both shipped implementations normalize `''` to
    // `undefined` before the overlay ever sees it, so a fake that does the same tests
    // their normalization instead of this guard.
    const { config, resolveCredentials } = await load({ MAILGUN_API_KEY: 'from-the-env' });

    const summary = await resolveCredentials(rawResolverWith({ MAILGUN_API_KEY: '' }));

    expect(config.email.mailgun.apiKey).toBe('from-the-env');
    expect(summary.resolved).not.toContain('MAILGUN_API_KEY');
  });

  it('does not blank an unset credential into an empty string either', async () => {
    // `undefined` and `''` must both be no-ops. Writing `''` would make
    // `config.storage.s3.accessKeyId` defined-but-empty, which the S3 adapter treats
    // differently from absent: absent falls through to the SDK's default credential
    // chain — the execution role — while an empty key is a credential it will try to
    // sign with and fail.
    const { config, resolveCredentials } = await load();

    await resolveCredentials(rawResolverWith({ STORAGE_S3_ACCESS_KEY_ID: '' }));

    expect(config.storage.s3.accessKeyId).toBeUndefined();
  });

  it('lets the resolver win over the environment when both are set', async () => {
    // The migration path: a deployment moving a key into a secret store does not have
    // to delete the environment copy in the same change.
    const { config, resolveCredentials } = await load({ MAILGUN_API_KEY: 'from-the-env' });

    await resolveCredentials(resolverWith({ MAILGUN_API_KEY: 'from-the-store' }));

    expect(config.email.mailgun.apiKey).toBe('from-the-store');
  });
});

describe('failure is closed, not degraded', () => {
  it('propagates a resolver failure instead of falling back to the environment', async () => {
    // On a target pointed at Secrets Manager, the environment holds nothing — so a
    // swallowed AccessDeniedException means booting with every credential unset and
    // discovering it one failed third-party call at a time.
    const { resolveCredentials } = await load();
    const resolver: ISecretResolver = {
      resolve: vi.fn().mockRejectedValue(new Error('AccessDeniedException')),
    };

    await expect(resolveCredentials(resolver)).rejects.toThrow('AccessDeniedException');
  });

  it('reports key names only, never values', async () => {
    // The summary is logged at boot. A value in it would put the credential in
    // CloudWatch, which is the leak this slice exists to close, moved to a new place.
    const { resolveCredentials } = await load();

    const summary = await resolveCredentials(resolverWith({ MAILGUN_API_KEY: 'super-secret' }));

    expect(summary.resolved).toEqual(['MAILGUN_API_KEY']);
    expect(JSON.stringify(summary)).not.toContain('super-secret');
  });
});
