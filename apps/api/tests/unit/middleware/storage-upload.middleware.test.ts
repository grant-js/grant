import type { NextFunction, Request, Response } from 'express';
import express from 'express';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-upload-route-'));

/**
 * Mocked rather than mutated: the real `config` is readonly, and this suite needs
 * `basePath` pointed at a temp directory it can inspect afterwards.
 */
const mockConfig = {
  storage: {
    provider: 'local',
    local: { basePath, contentTypes: { '.png': 'image/png', '.json': 'application/json' } },
    upload: { maxFileSize: 5 * 1024 * 1024 },
    cdmImport: { maxBytes: 64 * 1024 * 1024 },
  },
  // Deliberately small: the CDM cases below send a body far larger than this, which is
  // only possible if the JSON parser really does leave a storage PUT alone.
  app: { jsonBodyLimitBytes: 1024 * 1024 },
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

const { jsonBodyParser } = await import('@/middleware/json-body.middleware');
const { addressesCdmImport, storageMiddleware, uploadMiddleware } =
  await import('@/middleware/storage.middleware');
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
app.use(jsonBodyParser());
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

  it('refuses a PUT whose signature parameters arrived as arrays', async () => {
    const body = Buffer.from('a'.repeat(16));
    const minted = await mint('users/1/array-query.png', body);
    const url = new URL(minted, 'http://placeholder.invalid');
    const exp = url.searchParams.get('exp') as string;

    const response = await request(app)
      .put(`${url.pathname}${url.search}&exp=${exp}`)
      .set('Content-Type', 'image/png')
      .send(body);

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(fs.stat(path.join(basePath, 'users/1/array-query.png'))).rejects.toMatchObject({
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
    // thing between the two, so relaxing it to 'allow' must fail this. See ADR 0007.
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

const IMPORT_KEY = 'imports/projects/00000000-0000-4000-8000-000000000011/upload-1.json';
const cdmDocument = (bytes: number) => Buffer.from(JSON.stringify({ pad: 'x'.repeat(bytes - 10) }));
/** superagent JSON-encodes a Buffer sent with a JSON content type, so JSON bodies go as text. */
const asText = (body: Buffer) => body.toString('utf8');

describe('PUT /storage — the CDM import write path (ADR 0009)', () => {
  it('stores a 20 MiB application/json body, far past the JSON parser limit and the image cap', async () => {
    // Both would refuse it if they saw it: `express.json` (1 MiB here, 10 MiB by default) because
    // the type is application/json, and the 5 MiB picture cap because it is a picture cap. It is
    // written because the URL signed exactly this length.
    const body = cdmDocument(20 * 1024 * 1024);
    const url = await mint(IMPORT_KEY, body, 'application/json');

    const response = await request(app)
      .put(url)
      .set('Content-Type', 'application/json')
      .send(asText(body));

    expect(response.status).toBe(204);
    // `equals`, not `toEqual`: diffing two 20 MiB buffers element by element exhausts the heap.
    expect((await fs.readFile(path.join(basePath, IMPORT_KEY))).equals(body)).toBe(true);
  });

  it('stores a body that is JSON byte for byte, not a parsed and re-serialized copy', async () => {
    // `express.json` would turn this into an object; what the worker reads back must be
    // the bytes the client sent, whitespace and all.
    const body = Buffer.from('{ "a" :   1 ,\n "b": [ 1,2 ] }');
    const url = await mint('imports/projects/p/exact.json', body, 'application/json');

    await request(app)
      .put(url)
      .set('Content-Type', 'application/json')
      .send(asText(body))
      .expect(204);

    expect(
      (await fs.readFile(path.join(basePath, 'imports/projects/p/exact.json'))).equals(body)
    ).toBe(true);
  });

  it('refuses a picture URL that carries a CDM-sized body, and writes nothing', async () => {
    // The ceiling rose to the largest purpose cap; the URL's own exact length did not move.
    const small = Buffer.from('p'.repeat(1000));
    const url = await mint('users/1/swap.png', small);

    const response = await request(app)
      .put(url)
      .set('Content-Type', 'image/png')
      .send(Buffer.alloc(20 * 1024 * 1024, 1));

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(fs.stat(path.join(basePath, 'users/1/swap.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('refuses a CDM URL that carries more than it signed, and writes nothing', async () => {
    const signed = cdmDocument(1024);
    const url = await mint('imports/projects/p/grew.json', signed, 'application/json');

    const response = await request(app)
      .put(url)
      .set('Content-Type', 'application/json')
      .send(asText(cdmDocument(2048)));

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(
      fs.stat(path.join(basePath, 'imports/projects/p/grew.json'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses a CDM URL that carries less than it signed', async () => {
    const url = await mint('imports/projects/p/short.json', cdmDocument(2048), 'application/json');

    const response = await request(app)
      .put(url)
      .set('Content-Type', 'application/json')
      .send(asText(cdmDocument(1024)));

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(
      fs.stat(path.join(basePath, 'imports/projects/p/short.json'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses an unsigned PUT of a large body before reading it', async () => {
    // The signature is checked first, so an anonymous caller cannot make the process buffer
    // tens of MiB to learn the signature was wrong. Refusing without reading means the server
    // may close the connection while the client is still writing, which supertest reports as
    // a reset rather than a status: either is a refusal, and what matters is the file.
    const outcome = await request(app)
      .put(`/storage/imports/projects/p/unsigned.json`)
      .set('Content-Type', 'application/json')
      .send(asText(cdmDocument(8 * 1024 * 1024)))
      .then(
        (response) => response.status,
        (error: NodeJS.ErrnoException) => error.code
      );

    expect(outcome === 'ECONNRESET' || outcome === 'EPIPE' || Number(outcome) >= 400).toBe(true);
    await expect(
      fs.stat(path.join(basePath, 'imports/projects/p/unsigned.json'))
    ).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('refuses a URL signed for more than the ceiling, even though the signature holds', async () => {
    // A bug at mint must not turn the local route into an unbounded write.
    const url = await adapter.getUploadUrl('imports/projects/p/huge.json', {
      contentLength: 65 * 1024 * 1024,
      contentType: 'application/json',
      expiresInSeconds: 60,
    });

    const response = await request(app)
      .put(url.url)
      .set('Content-Type', 'application/json')
      .send(asText(cdmDocument(65 * 1024 * 1024)));

    expect(response.status).toBeGreaterThanOrEqual(400);
    await expect(
      fs.stat(path.join(basePath, 'imports/projects/p/huge.json'))
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

describe('GET /storage — an import is never served', () => {
  beforeAll(async () => {
    const body = Buffer.from('{"secret":"clientSecret-value"}');
    await request(app)
      .put(await mint(IMPORT_KEY, body, 'application/json'))
      .set('Content-Type', 'application/json')
      .send(asText(body))
      .expect(204);
    // A neighbour that must stay readable, so the exclusion is shown to be a prefix and not
    // a mount that stopped serving.
    const picture = Buffer.from('png-bytes');
    await request(app)
      .put(await mint('users/9/ok.png', picture))
      .set('Content-Type', 'image/png')
      .send(picture)
      .expect(204);
  });

  it('really is on disk under basePath, so the 404 below is the middleware and not an absence', async () => {
    expect((await fs.readFile(path.join(basePath, IMPORT_KEY))).toString()).toContain(
      'clientSecret'
    );
  });

  it.each([
    ['plainly', `/storage/${IMPORT_KEY}`],
    [
      'percent-encoded',
      `/storage/%69mports/projects/00000000-0000-4000-8000-000000000011/upload-1.json`,
    ],
    ['with a dot segment', `/storage/./${IMPORT_KEY}`],
    ['through a parent segment', `/storage/users/../${IMPORT_KEY}`],
    [
      'with a different case',
      `/storage/IMPORTS/projects/00000000-0000-4000-8000-000000000011/upload-1.json`,
    ],
    ['with a doubled slash', `/storage//${IMPORT_KEY}`],
    ['as the directory', '/storage/imports/'],
    ['as the bare prefix', '/storage/imports'],
  ])('answers 404 for a GET %s', async (_label, url) => {
    const response = await request(app).get(url);

    expect(response.status).toBe(404);
    expect(response.text).not.toContain('clientSecret');
  });

  it('answers 404 for a HEAD', async () => {
    expect((await request(app).head(`/storage/${IMPORT_KEY}`)).status).toBe(404);
  });

  it('still serves everything else', async () => {
    const response = await request(app).get('/storage/users/9/ok.png');

    expect(response.status).toBe(200);
  });
});

describe('addressesCdmImport', () => {
  it.each([
    '/imports/a.json',
    '/imports',
    '/IMPORTS/a.json',
    '/%69mports/a.json',
    '//imports/a.json',
    '/./imports/a.json',
    '/x/../imports/a.json',
    '/%E0%A4%A', // does not decode: refused rather than guessed at
  ])('recognizes %s', (url) => {
    expect(addressesCdmImport(url)).toBe(true);
  });

  it.each(['/', '/users/1/a.png', '/imports-archive/a.json', '/users/imports/a.json', '/importsx'])(
    'does not recognize %s',
    (url) => {
      expect(addressesCdmImport(url)).toBe(false);
    }
  );
});
