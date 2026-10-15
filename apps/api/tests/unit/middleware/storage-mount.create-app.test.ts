/**
 * The local storage mount as `createApp` wires it, end to end over HTTP (ADR 0009).
 *
 * `storage-upload.middleware.test.ts` holds each middleware to its contract on a hand-built app.
 * This is the one place the *composition* is held: that the real pipeline lets a 3 MiB
 * `application/json` PUT through a 1 MiB JSON limit to the upload route, that the stored bytes
 * are the sent bytes, that the document it stored cannot then be fetched back over the static mount,
 * and that a picture still can. It needs no database: all of it is answered before the context
 * middleware, which is why the boot stubs below are the same as `middleware-order.test.ts`.
 */
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

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

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-create-app-storage-'));

const ENV: Record<string, string> = {
  DB_URL: 'postgres://user:pass@localhost:5432/grant',
  DB_BOOTSTRAP_ON_BOOT: 'false',
  NODE_ENV: 'development',
  CACHE_STRATEGY: 'memory',
  EMAIL_PROVIDER: 'console',
  STORAGE_PROVIDER: 'local',
  STORAGE_LOCAL_BASE_PATH: basePath,
  SECURITY_FRONTEND_URL: 'http://localhost:3000',
  API_JSON_BODY_LIMIT_BYTES: String(1024 * 1024),
  SECURITY_ENABLE_RATE_LIMIT: 'false',
};

const S3_ENV: Record<string, string> = {
  STORAGE_PROVIDER: 's3',
  STORAGE_S3_BUCKET: 'unused-test-bucket',
  STORAGE_S3_REGION: 'eu-central-1',
  STORAGE_S3_ACCESS_KEY_ID: 'test-access-key',
  STORAGE_S3_SECRET_ACCESS_KEY: 'test-secret-key',
};

async function boot(overrides: Record<string, string> = {}) {
  vi.resetModules();
  for (const [key, value] of Object.entries({ ...ENV, ...overrides })) {
    vi.stubEnv(key, value);
  }
  const { createApp } = await import('@/create-app');
  const { LocalStorageAdapter } = await import('@/lib/storage');
  const { app, shutdown } = await createApp();
  const adapter = new LocalStorageAdapter({ basePath }, {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as never);
  return { app, adapter, shutdown };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
});

describe('createApp: PUT and GET /storage', () => {
  it('stores a JSON upload past the JSON body limit and never serves it back', async () => {
    const { app, adapter, shutdown } = await boot();

    try {
      const key = 'imports/projects/00000000-0000-4000-8000-000000000011/u-1.json';
      const document = JSON.stringify({
        clientSecret: 's'.repeat(32),
        pad: 'x'.repeat(3 * 1024 * 1024),
      });
      const minted = await adapter.getUploadUrl(key, {
        contentLength: Buffer.byteLength(document),
        contentType: 'application/json',
        expiresInSeconds: 60,
      });

      const put = await request(app)
        .put(minted.url)
        .set('Content-Type', 'application/json')
        .send(document);

      expect(put.status).toBe(204);
      // Byte for byte: it was read as bytes, not parsed and re-serialized.
      expect((await fs.readFile(path.join(basePath, key))).toString('utf8') === document).toBe(
        true
      );

      const get = await request(app).get(`/storage/${key}`);
      expect(get.status).toBe(404);
      expect(get.text).not.toContain('clientSecret');
    } finally {
      await shutdown.stopApollo();
      await shutdown.disconnectCache();
      await shutdown.closeDatabase();
    }
  }, 30_000);

  it('still serves a picture from the same mount', async () => {
    const { app, adapter, shutdown } = await boot();

    try {
      const bytes = Buffer.from('png-bytes');
      const minted = await adapter.getUploadUrl('users/9/avatar.png', {
        contentLength: bytes.length,
        contentType: 'image/png',
        expiresInSeconds: 60,
      });
      await request(app).put(minted.url).set('Content-Type', 'image/png').send(bytes).expect(204);

      const get = await request(app).get('/storage/users/9/avatar.png');

      expect(get.status).toBe(200);
    } finally {
      await shutdown.stopApollo();
      await shutdown.disconnectCache();
      await shutdown.closeDatabase();
    }
  }, 30_000);
});

describe('createApp: /storage on the S3 provider', () => {
  // Nothing mounts `/storage` here, so it is an unknown path like any other. The AWS target
  // never routes it to the API; this holds that the API itself answers 404, with nothing
  // in the body that names the bucket or any stored object, if something does.
  it.each([
    ['GET', 'imports/projects/00000000-0000-4000-8000-000000000011/u-1.json'],
    ['GET', 'users/9/avatar.png'],
    [
      'PUT',
      'imports/projects/00000000-0000-4000-8000-000000000011/u-1.json?exp=1&len=2&ct=application%2Fjson&sig=x',
    ],
  ])(
    'answers 404 to %s /storage/%s',
    async (method, key) => {
      const { app, shutdown } = await boot(S3_ENV);

      try {
        const url = `/storage/${key}`;
        const res =
          method === 'PUT'
            ? await request(app).put(url).set('Content-Type', 'application/json').send('{}')
            : await request(app).get(url);

        expect(res.status).toBe(404);
        expect(res.text).not.toContain('unused-test-bucket');
      } finally {
        await shutdown.stopApollo();
        await shutdown.disconnectCache();
        await shutdown.closeDatabase();
      }
    },
    30_000
  );
});
