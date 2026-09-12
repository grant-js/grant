import type { ISecretResolver } from '@grantjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The overlay runs before `validateConfig()`, and that ordering *is* the fail-closed
 * guarantee.
 *
 * `validateConfig` already refuses to boot when the selected provider's credentials are
 * absent — `MAILGUN_API_KEY` under `EMAIL_PROVIDER=mailgun`, `SMTP_PASSWORD` under
 * `smtp`. Resolving first means those checks see the resolved values, so two things
 * hold at once:
 *
 *   - a deployment keeping its key in a secret store boots, instead of being told to
 *     put a copy in the environment (the mistake `GITHUB_CLIENT_SECRET` already made
 *     once, which forced a placeholder string into a Lambda environment on the first
 *     real deploy);
 *   - a deployment whose secret is missing or misnamed **fails at boot**, instead of
 *     constructing a mail adapter around an empty string and discovering it at the
 *     first password reset.
 *
 * byo-database's F4 is the precedent for the second: an empty `DB_URL` surfaced as a
 * connection error to `localhost` rather than as the configuration error it was.
 *
 * Reverse the two calls and this file fails. That is the whole point of it.
 */

const MAILGUN_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  STORAGE_PROVIDER: 'local',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
  EMAIL_PROVIDER: 'mailgun',
  EMAIL_FROM: 'no-reply@example.com',
  EMAIL_FROM_NAME: 'Grant',
  MAILGUN_DOMAIN: 'mg.example.com',
  // The key under test: absent from the environment, as it is on a target that refuses
  // to carry credentials in environment variables.
  MAILGUN_API_KEY: '',
};

function resolverWith(values: Record<string, string>): ISecretResolver {
  return { resolve: async (name: string) => values[name] || undefined };
}

async function load(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...MAILGUN_ENV, ...env })) {
    vi.stubEnv(key, value);
  }
  return import('@/config');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('a provider credential held only in the secret store', () => {
  it('fails validation when the overlay has not run', async () => {
    // The state `createApp` would be in if the two calls were the other way round.
    // Recorded as an assertion because "it would have failed" is the claim the ordering
    // rests on, and an untested claim about ordering is how orderings drift.
    const { validateConfig } = await load();

    expect(() => validateConfig()).toThrow(/MAILGUN_API_KEY/);
  });

  it('passes validation once the overlay has run', async () => {
    const { resolveCredentials, validateConfig } = await load();

    await resolveCredentials(resolverWith({ MAILGUN_API_KEY: 'key-from-the-store' }));

    expect(() => validateConfig()).not.toThrow();
  });
});

describe('a provider credential held nowhere at all', () => {
  it('still fails validation after the overlay, rather than booting unconfigured', async () => {
    // The fail-closed case. An adapter built around an empty API key is a mail provider
    // that accepts every send and delivers nothing.
    const { resolveCredentials, validateConfig } = await load();

    const summary = await resolveCredentials(resolverWith({}));

    expect(summary.resolved).toEqual([]);
    expect(() => validateConfig()).toThrow(/MAILGUN_API_KEY/);
  });

  it('names the key, so the failure says what to fix', async () => {
    const { resolveCredentials, validateConfig } = await load();
    await resolveCredentials(resolverWith({}));

    expect(() => validateConfig()).toThrow(/Configuration validation failed/);
    expect(() => validateConfig()).toThrow(/mailgun provider/);
  });
});

describe('createApp wires the two in that order', () => {
  it('calls resolveCredentials before validateConfig', async () => {
    // The assertions above prove the ordering *matters*; this proves `create-app.ts`
    // actually has it. Recorded as a call sequence rather than by booting the app,
    // because booting it with a deliberately broken config is a slower way to learn
    // less.
    vi.resetModules();
    for (const [key, value] of Object.entries(MAILGUN_ENV)) vi.stubEnv(key, value);

    const calls: string[] = [];

    vi.doMock('@/config', async () => {
      const actual = await vi.importActual<typeof import('@/config')>('@/config');
      return {
        ...actual,
        resolveCredentials: vi.fn(async () => {
          calls.push('resolveCredentials');
          return { resolved: [] };
        }),
        validateConfig: vi.fn(() => {
          calls.push('validateConfig');
        }),
        printConfigSummary: vi.fn(async () => {
          calls.push('printConfigSummary');
        }),
      };
    });

    vi.doMock('@grantjs/database', async () => ({
      ...(await vi.importActual<typeof import('@grantjs/database')>('@grantjs/database')),
      initializeDBConnection: vi.fn(() => ({ $client: { end: vi.fn() } })),
      bootstrapDatabase: vi.fn(async () => undefined),
      closeDatabase: vi.fn(async () => undefined),
    }));

    vi.doMock('@/lib/secrets', () => ({
      resolveDatabaseConnectionString: vi.fn(
        async () => 'postgres://user:pass@localhost:5432/grant'
      ),
      // `undefined` is password auth, which is what this test exercises.
      resolveDatabasePassword: vi.fn(() => undefined),
      secretResolver: { resolve: vi.fn(async () => undefined) },
    }));

    const { createApp } = await import('@/create-app');
    const { shutdown } = await createApp();

    try {
      expect(calls.indexOf('resolveCredentials')).toBe(0);
      expect(calls.indexOf('resolveCredentials')).toBeLessThan(calls.indexOf('validateConfig'));
    } finally {
      await shutdown.stopApollo();
      await shutdown.disconnectCache();
    }

    vi.doUnmock('@/config');
    vi.doUnmock('@grantjs/database');
    vi.doUnmock('@/lib/secrets');
  }, 30_000);
});
