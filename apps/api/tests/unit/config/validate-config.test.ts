import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Covers `validateConfig()` — the only behavioural surface in the 1,051-line
 * `env.config.ts`, and the thing standing between a misconfigured deploy and a
 * server that boots into a broken state.
 *
 * The config constants are built at module load from `process.env`, so each
 * case stubs the environment and re-imports rather than mutating exports.
 * `vi.resetModules()` between cases is what makes that work.
 */
/**
 * Every credential the validator inspects is pinned empty here. Without that
 * the repo's own `.env` leaks in and cases pass for the wrong reason — which is
 * how the SES case first appeared to be a bug in the validator.
 */
const BASE_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  EMAIL_FROM: '',
  STORAGE_PROVIDER: 'local',
  REDIS_HOST: 'localhost',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
  MAILGUN_API_KEY: '',
  MAILGUN_DOMAIN: '',
  MAILJET_API_KEY: '',
  MAILJET_SECRET_KEY: '',
  EMAIL_SES_CLIENT_ID: '',
  EMAIL_SES_CLIENT_SECRET: '',
  SMTP_HOST: '',
  SMTP_USER: '',
  SMTP_PASSWORD: '',
};

async function loadWith(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...BASE_ENV, ...overrides })) {
    if (value === undefined) {
      vi.stubEnv(key, '');
    } else {
      vi.stubEnv(key, value);
    }
  }
  const module = await import('@/config/env.config');
  return module.validateConfig;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('validateConfig', () => {
  it('accepts the s3 provider without static credentials', async () => {
    // On Lambda or Fargate the SDK's default credential chain applies and the
    // execution role supplies credentials, so requiring static keys would force a
    // long-lived secret to store and rotate for no benefit. CACHE_DYNAMODB_* and
    // JOBS_AWS_* have always worked this way; S3 requiring them blocked the AWS
    // target outright (ADR 0004, Correction 2026-08-30).
    const validateConfig = await loadWith({
      STORAGE_PROVIDER: 's3',
      STORAGE_S3_BUCKET: 'grant-uploads',
      STORAGE_S3_ACCESS_KEY_ID: '',
      STORAGE_S3_SECRET_ACCESS_KEY: '',
    });

    expect(() => validateConfig()).not.toThrow();
  });

  it('still requires a bucket for the s3 provider', async () => {
    // The credentials are optional; the bucket is not — nothing can infer it.
    const validateConfig = await loadWith({
      STORAGE_PROVIDER: 's3',
      STORAGE_S3_BUCKET: '',
    });

    expect(() => validateConfig()).toThrow(/STORAGE_S3_BUCKET is required/);
  });

  it('accepts a minimal valid configuration', async () => {
    const validateConfig = await loadWith({});

    expect(() => validateConfig()).not.toThrow();
  });

  /**
   * The `DB_URL is required` branch is **unreachable**. `DB_CONFIG.url` comes
   * from `resolveDatabaseUrl`, which falls back to a `postgresql://…` template
   * built from the `POSTGRES_*` vars — that string is never empty, even when
   * every part is undefined. So an operator who forgets the database
   * configuration entirely gets a connection failure at runtime rather than the
   * startup error this check was written to produce.
   *
   * Pinned as-is rather than fixed: the fix is a decision about what a valid
   * database configuration means, which belongs with the config owner.
   */
  it('does not reject an unset DB_URL, because the fallback is never empty', async () => {
    const validateConfig = await loadWith({ DB_URL: '' });

    expect(() => validateConfig()).not.toThrow();
  });

  it('requires a Redis host only when the cache strategy is redis', async () => {
    const withMemory = await loadWith({ CACHE_STRATEGY: 'memory', REDIS_HOST: '' });
    expect(() => withMemory()).not.toThrow();

    const withRedis = await loadWith({ CACHE_STRATEGY: 'redis', REDIS_HOST: '' });
    expect(() => withRedis()).toThrow(/REDIS_HOST is required/);
  });

  it('accepts the console email provider with no credentials', async () => {
    const validateConfig = await loadWith({ EMAIL_PROVIDER: 'console', EMAIL_FROM: '' });

    expect(() => validateConfig()).not.toThrow();
  });

  it.each([
    ['mailgun', /MAILGUN_API_KEY and MAILGUN_DOMAIN/],
    ['mailjet', /MAILJET_API_KEY and MAILJET_SECRET_KEY/],
    ['ses', /EMAIL_SES_CLIENT_ID and EMAIL_SES_CLIENT_SECRET/],
    ['smtp', /SMTP_HOST, SMTP_USER, and SMTP_PASSWORD/],
  ])('names the missing credentials for the %s provider', async (provider, expected) => {
    const validateConfig = await loadWith({
      EMAIL_PROVIDER: provider,
      EMAIL_FROM: 'noreply@example.com',
    });

    expect(() => validateConfig()).toThrow(expected);
  });

  it('requires a from address for any non-console provider', async () => {
    const validateConfig = await loadWith({ EMAIL_PROVIDER: 'smtp', EMAIL_FROM: '' });

    expect(() => validateConfig()).toThrow(/EMAIL_FROM is required/);
  });

  // Production is the case that matters: development tolerates an unset
  // frontend URL, production must not.
  it('requires the frontend URL in production only', async () => {
    const inDev = await loadWith({ NODE_ENV: 'development', SECURITY_FRONTEND_URL: '' });
    expect(() => inDev()).not.toThrow();

    const inProd = await loadWith({ NODE_ENV: 'production', SECURITY_FRONTEND_URL: '' });
    expect(() => inProd()).toThrow(/SECURITY_FRONTEND_URL must be set in production/);
  });

  it('reports every problem at once rather than the first', async () => {
    const validateConfig = await loadWith({
      CACHE_STRATEGY: 'redis',
      REDIS_HOST: '',
      EMAIL_PROVIDER: 'smtp',
      EMAIL_FROM: '',
    });

    expect(() => validateConfig()).toThrow(
      /REDIS_HOST is required[\s\S]*EMAIL_FROM is required[\s\S]*SMTP_HOST/
    );
  });
});
