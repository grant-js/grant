import * as http from 'node:http';
import type { AddressInfo } from 'node:net';

import { AuthorizationError, GrantException, noopLogger, ValidationError } from '@grantjs/core';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

import { runFileStorageConformance } from '../conformance-suite';
import { LocalStorageAdapter } from './index';

/**
 * A real filesystem, not a mock. The adapter's whole job is `fs` calls, so a mock
 * would assert that the test doubles behave the way the test doubles were written
 * to behave. A temp directory costs nothing and tests the thing.
 */
const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-storage-conformance-'));

afterAll(async () => {
  await fs.rm(basePath, { recursive: true, force: true });
});

const adapter = new LocalStorageAdapter({ basePath }, noopLogger);

/**
 * A throwaway stand-in for the application's `PUT /storage/*` route.
 *
 * It is deliberately thin — parse, delegate, translate the error to a status — for
 * the same reason the route is: every rule about what a minted URL permits lives in
 * `verifyUploadUrl`, so this server and the Express route cannot drift apart on the
 * part that matters. `@grantjs/storage` does not depend on Express, so this uses
 * `node:http` directly.
 */
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const storagePath = decodeURIComponent(url.pathname.replace(/^\/storage\//, ''));
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    void adapter
      .verifyUploadUrl(
        storagePath,
        {
          exp: url.searchParams.get('exp') ?? undefined,
          len: url.searchParams.get('len') ?? undefined,
          ct: url.searchParams.get('ct') ?? undefined,
          sig: url.searchParams.get('sig') ?? undefined,
        },
        { contentType: req.headers['content-type'], contentLength: body.length }
      )
      .then(async ({ contentType }) => {
        await adapter.upload(body, storagePath, { contentType });
        res.writeHead(204).end();
      })
      .catch((error: unknown) => {
        res.writeHead(error instanceof AuthorizationError ? 403 : 400).end();
      });
  });
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

afterAll(() => {
  server.close();
});

runFileStorageConformance(
  'local',
  {
    create: () => adapter,
    readBack: (filePath) => fs.readFile(path.join(basePath, filePath)),
    put: async (url, method, headers, body) => {
      const response = await fetch(new URL(url, origin), { method, headers, body });
      return { status: response.status };
    },
  },
  {
    urlsAreAbsolute: false,
    // Our own code does the enforcing here, so it is provable in the unit lane —
    // the asymmetry with S3 that the divergence index records.
    enforcesUrlConstraints: true,
  }
);

/**
 * The local side of the divergence index in ../conformance-suite.ts. These are the
 * behaviours the shared suite may not assert because `s3` does something else.
 */
describe('local adapter divergences', () => {
  it('divergence 1 — builds an app-relative /storage URL, not an absolute one', async () => {
    expect(await adapter.getUrl('users/1/avatar.png')).toBe('/storage/users/1/avatar.png');
  });

  it('divergence 2 — returns a URL for a path that was never uploaded', async () => {
    expect(await adapter.getUrl('nothing-here.png')).toBe('/storage/nothing-here.png');
  });

  it('divergence 3 — ignores options.public entirely', async () => {
    const publicResult = await adapter.upload(Buffer.from('a'), 'flagged-public.bin', {
      public: true,
    });
    const privateResult = await adapter.upload(Buffer.from('a'), 'flagged-private.bin', {
      public: false,
    });

    expect(publicResult.url).toBe('/storage/flagged-public.bin');
    expect(privateResult.url).toBe('/storage/flagged-private.bin');
  });
});

/**
 * The signing key, which has no counterpart on S3: there, the URL is signed with
 * credentials the adapter already holds. Here the adapter has to manage a key, and
 * where it lives is the decision ADR 0007 records.
 */
describe('local upload signing key', () => {
  const keyPath = path.join(basePath, '.grant-upload-key');

  it('is created under basePath, dot-prefixed, readable only by its owner', async () => {
    await adapter.getUploadUrl('key/created.png', {
      contentLength: 1,
      contentType: 'image/png',
      expiresInSeconds: 60,
    });

    const stats = await fs.stat(keyPath);
    expect(stats.size).toBe(32);
    expect(stats.mode & 0o777).toBe(0o600);
  });

  it('cannot be targeted by a mint, so a URL can never overwrite it', async () => {
    // `express.static`'s `dotfiles: 'deny'` stops the key being read over the same
    // mount that serves the files beside it. This stops it being written — a mint
    // for the key path would be a capability to replace the key that authorizes
    // every other mint.
    await expect(
      adapter.getUploadUrl('.grant-upload-key', {
        contentLength: 32,
        contentType: 'application/octet-stream',
        expiresInSeconds: 60,
      })
    ).rejects.toBeInstanceOf(GrantException);
  });

  it('is shared by a second adapter over the same basePath', async () => {
    // The replica case, and the restart case. Both are why the key is a file on the
    // volume rather than a per-process random value.
    const minted = await adapter.getUploadUrl('key/shared.png', {
      contentLength: 4,
      contentType: 'image/png',
      expiresInSeconds: 900,
    });
    const query = new URL(minted.url, 'http://placeholder.invalid').searchParams;

    const replica = new LocalStorageAdapter({ basePath }, noopLogger);

    await expect(
      replica.verifyUploadUrl('key/shared.png', {
        exp: query.get('exp') ?? undefined,
        len: query.get('len') ?? undefined,
        ct: query.get('ct') ?? undefined,
        sig: query.get('sig') ?? undefined,
      })
    ).resolves.toEqual({ contentLength: 4, contentType: 'image/png' });
  });

  it('is not shared by an adapter over a different basePath', async () => {
    const minted = await adapter.getUploadUrl('key/foreign.png', {
      contentLength: 4,
      contentType: 'image/png',
      expiresInSeconds: 900,
    });
    const query = new URL(minted.url, 'http://placeholder.invalid').searchParams;
    const otherBase = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-storage-other-'));

    const stranger = new LocalStorageAdapter({ basePath: otherBase }, noopLogger);

    await expect(
      stranger.verifyUploadUrl('key/foreign.png', {
        exp: query.get('exp') ?? undefined,
        len: query.get('len') ?? undefined,
        ct: query.get('ct') ?? undefined,
        sig: query.get('sig') ?? undefined,
      })
    ).rejects.toBeInstanceOf(AuthorizationError);

    await fs.rm(otherBase, { recursive: true, force: true });
  });

  it('uses an explicit uploadSigningSecret and writes no key file', async () => {
    const configuredBase = await fs.mkdtemp(path.join(os.tmpdir(), 'grant-storage-configured-'));
    const configured = new LocalStorageAdapter(
      { basePath: configuredBase, uploadSigningSecret: 'a-secret-from-the-operator' },
      noopLogger
    );

    await configured.getUploadUrl('configured.png', {
      contentLength: 1,
      contentType: 'image/png',
      expiresInSeconds: 60,
    });

    await expect(fs.stat(path.join(configuredBase, '.grant-upload-key'))).rejects.toMatchObject({
      code: 'ENOENT',
    });

    await fs.rm(configuredBase, { recursive: true, force: true });
  });

  it('upload refuses a path that would leave the storage root', async () => {
    await expect(adapter.upload(Buffer.from('x'), '../outside.png')).rejects.toBeInstanceOf(
      ValidationError
    );

    await expect(fs.stat(path.join(path.dirname(basePath), 'outside.png'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('divergence — getMetadata reports no content type, because the filesystem holds none', async () => {
    await adapter.upload(Buffer.from('a'), 'typed-at-rest.png', { contentType: 'image/png' });

    const metadata = await adapter.getMetadata('typed-at-rest.png');

    expect(metadata?.size).toBe(1);
    expect(metadata?.contentType).toBeUndefined();
  });
});
