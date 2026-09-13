import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Holds the one ordering the edge trust model depends on: origin verification runs
 * before the rate limiter.
 *
 * Verify first and a request that did not arrive through the CDN is refused before it
 * can consume a rate-limit budget or the cache round-trip that budget costs. Verify
 * second and an unauthenticated caller reaching the Function URL directly can exhaust
 * counters keyed by an IP it does not own. `create-app.ts` has had the right order
 * since the origin-verify middleware landed; nothing asserted it, so nothing would
 * have noticed it moving.
 *
 * Asserted by *relative* position, never by index. Absolute indices would make every
 * unrelated `app.use` in the pipeline a failing test, and a test that fails for
 * reasons it does not care about gets deleted rather than read.
 */

/**
 * The boot path `createApp` runs before it mounts anything: a database connection, a
 * bootstrap that migrates, and a secret lookup. None of it is what this test is about,
 * and all of it needs infrastructure a unit test does not have.
 */
vi.mock('@grantjs/database', async (importOriginal) => ({
  // Partial: the repository layer imports table definitions and Drizzle types from
  // this package at module load, and replacing the whole module takes those with it.
  // Only the three functions that open or migrate a connection are stubbed.
  ...(await importOriginal<typeof import('@grantjs/database')>()),
  initializeDBConnection: vi.fn(() => ({ $client: { end: vi.fn() } })),
  bootstrapDatabase: vi.fn(async () => undefined),
  closeDatabase: vi.fn(async () => undefined),
}));

vi.mock('@/lib/secrets', () => ({
  resolveDatabaseConnectionString: vi.fn(async () => 'postgres://user:pass@localhost:5432/grant'),
  // `undefined` is password auth, which is what every test here exercises.
  resolveDatabasePassword: vi.fn(() => undefined),
  secretResolver: { resolve: vi.fn(async () => undefined) },
}));

/**
 * Pinned rather than inherited. The repo's own `.env` is loaded by `@grantjs/env`, so
 * without this the app under test is whatever the developer's machine is configured
 * for — and `CACHE_STRATEGY=redis` would make this a test that needs a Redis.
 */
const BASE_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  DB_BOOTSTRAP_ON_BOOT: 'false',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  STORAGE_PROVIDER: 'local',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
};

interface ExpressLayer {
  name: string;
  handle: { name?: string };
}

/** Boots the app and returns the mounted pipeline in mount order. */
async function mountedPipeline(): Promise<{ names: string[]; shutdown: () => Promise<void> }> {
  vi.resetModules();
  for (const [key, value] of Object.entries(BASE_ENV)) {
    vi.stubEnv(key, value);
  }

  const { createApp } = await import('@/create-app');
  const { app, shutdown } = await createApp();

  // Express 5 exposes the application router as `app.router`; each entry's `handle` is
  // the function passed to `app.use`, and `handle.name` is the only thing on a layer
  // that identifies which middleware it is.
  const stack = (app.router as unknown as { stack: ExpressLayer[] }).stack;

  return {
    names: stack.map((layer) => layer.handle?.name ?? ''),
    shutdown: async () => {
      await shutdown.stopApollo();
      await shutdown.disconnectCache();
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('createApp middleware order', () => {
  it('mounts origin verification before the rate limiter', async () => {
    const { names, shutdown } = await mountedPipeline();

    try {
      const originVerify = names.indexOf('verifyOrigin');
      const rateLimit = names.indexOf('rateLimit');

      // Asserted separately from the comparison. `indexOf` returns -1 for a name that
      // is not there, and -1 < anything — so a renamed or dropped middleware would
      // otherwise pass this test while proving nothing.
      expect(originVerify, 'verifyOrigin is not mounted').toBeGreaterThanOrEqual(0);
      expect(rateLimit, 'rateLimit is not mounted').toBeGreaterThanOrEqual(0);

      expect(originVerify).toBeLessThan(rateLimit);
    } finally {
      await shutdown();
    }
    // Explicit, and well above what the boot costs. This test builds the real app —
    // Apollo's schema, i18n's catalogues and the REST router's 87 registrations — which
    // measured ~2 s alone and over 5 s when the rest of the suite is competing for the
    // same cores. The default 5 s made it pass in isolation and time out in CI, which
    // is worse than slow.
  }, 30_000);
});
