import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createRestRouter = vi.hoisted(() =>
  vi.fn(() => {
    const router = express.Router();
    router.use((_req, res) => {
      res.status(200).json({ ok: true });
    });
    return router;
  })
);

vi.mock('@grantjs/database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@grantjs/database')>()),
  initializeDBConnection: vi.fn(() => ({ $client: { end: vi.fn() } })),
  bootstrapDatabase: vi.fn(async () => undefined),
  closeDatabase: vi.fn(async () => undefined),
}));

vi.mock('@/lib/secrets', () => ({
  resolveDatabaseConnectionString: vi.fn(async () => 'postgres://user:pass@localhost:5432/grant'),
  resolveDatabasePassword: vi.fn(() => undefined),
  secretResolver: { resolve: vi.fn(async () => undefined) },
}));

vi.mock('@/rest', () => ({ createRestRouter }));

const BASE_ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  DB_BOOTSTRAP_ON_BOOT: 'false',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  STORAGE_PROVIDER: 'local',
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('createApp REST router', () => {
  it('constructs the REST router once, not per /api request', async () => {
    vi.resetModules();
    for (const [key, value] of Object.entries(BASE_ENV)) {
      vi.stubEnv(key, value);
    }
    createRestRouter.mockClear();

    const { createApp } = await import('@/create-app');
    const { app, shutdown } = await createApp();

    try {
      await request(app).get('/api/other').expect(200);
      await request(app).get('/api/other').expect(200);
      expect(createRestRouter).toHaveBeenCalledTimes(1);
      expect(createRestRouter).toHaveBeenCalledWith();
    } finally {
      await shutdown.stopApollo();
      await shutdown.disconnectCache();
    }
  }, 30_000);
});
