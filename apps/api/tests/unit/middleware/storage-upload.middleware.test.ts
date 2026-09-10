import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-upload-route-'));

/**
 * Mocked rather than mutated: the real `config` is readonly, and this suite needs
 * `basePath` pointed at a temp directory it can inspect afterwards.
 */
const mockConfig = {
  storage: {
    provider: 'local',
    local: { basePath, contentTypes: { '.png': 'image/png' } },
    upload: { maxFileSize: 5 * 1024 * 1024 },
  },
};
vi.mock('@/config', () => ({ config: mockConfig }));

vi.mock('@/lib/logger', () => {
  const stub = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };
  return {
    logger: stub,
    createLogger: () => stub,
    loggerFactory: { createLogger: () => stub },
  };
});

vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const { storageMiddleware, uploadMiddleware } = await import('@/middleware/storage.middleware');
const { LocalStorageAdapter } = await import('@/lib/storage');
const { GrantException } = await import('@grantjs/core');

const adapter = new LocalStorageAdapter({ basePath }, {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
} as never);

/**
 * The mount order from `create-app.ts`, plus a terminal error handler standing in
 * for the real one — these tests assert the route's status codes, not the shape of
 * the error body, which `error.middleware.test.ts` owns.
 */
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/storage', uploadMiddleware());
app.use('/storage', storageMiddleware());
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = error instanceof GrantException && error.code === 'FORBIDDEN' ? 403 : 400;
  res.status(status).end();
});

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
});

const mint = async (storagePath: string, body: Buffer, contentType = 'image/png') => {
  const minted = await adapter.getUploadUrl(storagePath, {
    contentLength: body.length,
    contentType,
    expiresInSeconds: 900,
  });
  return minted.url;
};

describe('PUT /storage — the route that honours a minted URL', () => {
  it('stores the bytes and answers 204', async () => {
    const body = Buffer.from('p'.repeat(128));
    const url = await mint('users/1/avatar.png', body);

    const response = await request(app).put(url).set('Content-Type', 'image/png').send(body);

    expect(response.status).toBe(204);
    expect(await fs.readFile(path.join(basePath, 'users/1/avatar.png'))).toEqual(body);
  });

  it('refuses a PUT with no signature at all', async () => {
    const response = await request(app)
      .put('/storage/users/1/unsigned.png')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('x'));

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(fs.stat(path.join(basePath, 'users/1/unsigned.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('refuses a PUT whose signature was tampered with', async () => {
    const body = Buffer.from('t'.repeat(16));
    const url = new URL(await mint('users/1/forged.png', body), 'http://placeholder.invalid');
    const signature = url.searchParams.get('sig') as string;
    url.searchParams.set('sig', '0'.repeat(signature.length));

    const response = await request(app)
      .put(`${url.pathname}${url.search}`)
      .set('Content-Type', 'image/png')
      .send(body);

    expect(response.status).toBe(403);
  });

  it('leaves GET on the same mount working', async () => {
    const body = Buffer.from('g'.repeat(32));
    const url = await mint('users/1/readable.png', body);
    await request(app).put(url).set('Content-Type', 'image/png').send(body);

    const response = await request(app).get('/storage/users/1/readable.png');

    expect(response.status).toBe(200);
    expect(Buffer.from(response.body as Buffer)).toEqual(body);
  });
});

describe('the local signing key is not reachable over the mount it lives under', () => {
  it('never serves the key file — the dotfiles option is load-bearing', async () => {
    // The key authorizes every upload URL this target issues, and it lives inside
    // the directory `express.static` serves. The `dotfiles` option is the only
    // thing between the two, so relaxing it to 'allow' must fail this. See ADR 0006.
    //
    // Asserted as "not served", not as a status: measured on express 5.2.1, both
    // 'deny' and 'ignore' answer 404 here, so a status assertion could not tell
    // those two apart. It can tell either from 'allow', which answers 200 with the
    // key in the body — and that is the change worth catching.
    await adapter.getUploadUrl('users/1/make-the-key.png', {
      contentLength: 1,
      contentType: 'image/png',
      expiresInSeconds: 60,
    });
    const key = await fs.readFile(path.join(basePath, '.grant-upload-key'));

    const response = await request(app).get('/storage/.grant-upload-key');

    const served = Buffer.isBuffer(response.body)
      ? response.body
      : Buffer.from(response.text ?? '');
    expect(response.status).not.toBe(200);
    expect(served.equals(key)).toBe(false);
  });
});
