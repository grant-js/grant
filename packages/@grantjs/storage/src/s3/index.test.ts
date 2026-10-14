import { GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import {
  GrantException,
  noopLogger,
  NotFoundError,
  PayloadTooLargeError,
  ValidationError,
} from '@grantjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { S3StorageAdapter } from './index';

/**
 * Offline, on purpose, and this is where most of what matters about a presigned
 * URL is proven.
 *
 * Presigning is local computation: given static credentials, the URL a real PUT
 * would go to is fully determined without a network. That matters more than usual
 * here, because the integration lane runs against LocalStack 3.8, which does not
 * verify SigV4 at all — it cannot tell a correct URL from a forged one. What the
 * URL *commits to* is checkable here; whether S3 *enforces* it is checkable only
 * against a real bucket, on slice 16's deploy. See ADR 0007.
 */
const adapter = new S3StorageAdapter(
  {
    bucket: 'grant-offline',
    region: 'eu-central-1',
    accessKeyId: 'AKIAOFFLINE',
    secretAccessKey: 'offline-secret',
  },
  noopLogger
);

const mint = (path = 'tenants/t1/users/u1/avatar.png') =>
  adapter.getUploadUrl(path, {
    contentLength: 12_345,
    contentType: 'image/png',
    expiresInSeconds: 900,
  });

const signedHeaders = async () => {
  const { url } = await mint();
  return (new URL(url).searchParams.get('X-Amz-SignedHeaders') ?? '').split(';');
};

describe('S3 presigned upload URLs', () => {
  it('signs content-type', async () => {
    // The trap this test exists for: `getSignedUrl` accepts a `ContentType` on the
    // command and does *not* sign it unless `signableHeaders` names it. Without
    // that option the URL looks like it pins the type and accepts anything.
    expect(await signedHeaders()).toContain('content-type');
  });

  it('signs content-length', async () => {
    expect(await signedHeaders()).toContain('content-length');
  });

  it('carries no checksum parameters', async () => {
    // The second trap. A default client hoists `x-amz-checksum-crc32` — computed
    // over an empty body, since presigning never sees the bytes — into the signed
    // query string, and S3 then refuses the real PUT with
    // `400 InvalidRequest: Value for x-amz-checksum-crc32 header is invalid`.
    // This assertion is what catches it with no stack running.
    const { url } = await mint();

    const parameters = [...new URL(url).searchParams.keys()].map((key) => key.toLowerCase());

    expect(parameters.filter((key) => key.includes('checksum'))).toEqual([]);
  });

  it('leaves checksums on for the shared client, which upload() uses', async () => {
    // The other half of the previous test. Fixing the checksum trap by flipping the
    // shared client would silently remove checksums from `upload()`, an existing
    // working path — so the two clients are asserted to differ, by name.
    const shared = adapter['s3Client'] as S3Client;
    const presign = adapter['presignClient'] as S3Client;

    const resolve = async (client: S3Client) => {
      const value = client.config.requestChecksumCalculation;
      return typeof value === 'function' ? await value() : value;
    };

    expect(await resolve(shared)).toBe('WHEN_SUPPORTED');
    expect(await resolve(presign)).toBe('WHEN_REQUIRED');
  });

  it('sets the expiry the caller asked for', async () => {
    const { url } = await mint();

    expect(new URL(url).searchParams.get('X-Amz-Expires')).toBe('900');
  });

  it('addresses the requested key', async () => {
    const { url } = await mint('tenants/t1/reports/q3.pdf');

    expect(new URL(url).pathname).toContain('tenants/t1/reports/q3.pdf');
  });

  it('is not single-use: the same inputs inside one second sign identically', async () => {
    // Recorded rather than guarded against. SigV4 is deterministic to the second,
    // so a repeat mint is the same URL — which is the port's documented position
    // that a URL is replayable inside its window, not an adapter accident.
    const [first, second] = await Promise.all([mint(), mint()]);

    expect(first.url).toBe(second.url);
  });
});

/**
 * `download()` against a mocked client. The S3 SDK is the thing under test only in
 * the integration lane; what is checkable offline is which client is used, what is
 * sent, how each failure is classified, and that the size cap is applied before the
 * body is read.
 */
describe('S3 download', () => {
  const shared = () => adapter['s3Client'] as S3Client;
  const presign = () => adapter['presignClient'] as S3Client;
  const LIMIT = { maxBytes: 1024 };

  /**
   * A body that records whether anything was read from it and whether it was
   * destroyed. `chunks` is what it would yield if someone iterated it.
   */
  const trackedBody = (chunks: Uint8Array[]) => {
    const state = { read: false, destroyed: false };
    const body = {
      destroy: () => {
        state.destroyed = true;
      },
      transformToByteArray: async () => {
        state.read = true;
        return Buffer.concat(chunks);
      },
      async *[Symbol.asyncIterator]() {
        for (const chunk of chunks) {
          state.read = true;
          yield chunk;
        }
      },
    };
    return { body, state };
  };
  const httpError = (name: string, httpStatusCode: number) =>
    Object.assign(new Error(name), { name, $metadata: { httpStatusCode } });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the object body as a Buffer', async () => {
    const { body } = trackedBody([Uint8Array.from([0, 1]), Uint8Array.from([255])]);
    vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body, ContentLength: 3 } as never);

    const downloaded = await adapter.download('imports/p1/u1.json', LIMIT);

    expect(Buffer.isBuffer(downloaded)).toBe(true);
    expect([...downloaded]).toEqual([0, 1, 255]);
  });

  it('sends a GetObject for the configured bucket and the requested key', async () => {
    const { body } = trackedBody([]);
    const send = vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body } as never);

    await adapter.download('imports/p1/u1.json', LIMIT);

    const command = send.mock.calls[0]?.[0] as GetObjectCommand;
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command.input).toEqual({ Bucket: 'grant-offline', Key: 'imports/p1/u1.json' });
  });

  it('uses the shared client, not the presign client', async () => {
    // The presign client drops checksum calculation to keep presigned PUTs valid.
    // A real GET has no such need, and silently routing it there would be the same
    // "extend, do not replace" slip the presign client's own comment warns about.
    const { body } = trackedBody([]);
    const sharedSend = vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body } as never);
    const presignSend = vi.spyOn(presign(), 'send');

    await adapter.download('imports/p1/u1.json', LIMIT);

    expect(sharedSend).toHaveBeenCalledTimes(1);
    expect(presignSend).not.toHaveBeenCalled();
  });

  describe('the size cap', () => {
    it('refuses on ContentLength over maxBytes, destroying the body without reading it', async () => {
      const { body, state } = trackedBody([Buffer.alloc(2048)]);
      vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body, ContentLength: 2048 } as never);

      const outcome = await adapter
        .download('imports/p1/huge.json', LIMIT)
        .catch((caught: unknown) => caught);

      expect(outcome).toBeInstanceOf(PayloadTooLargeError);
      expect((outcome as PayloadTooLargeError).limitBytes).toBe(1024);
      expect((outcome as PayloadTooLargeError).receivedBytes).toBe(2048);
      expect(state.destroyed).toBe(true);
      expect(state.read).toBe(false);
    });

    it('accepts ContentLength of exactly maxBytes', async () => {
      const { body } = trackedBody([Buffer.alloc(1024, 7)]);
      vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body, ContentLength: 1024 } as never);

      expect((await adapter.download('imports/p1/exact.json', LIMIT)).length).toBe(1024);
    });

    it('counts while streaming when S3 reports no ContentLength, and aborts at maxBytes', async () => {
      // Four 400-byte chunks: the third pushes the running total to 1,200, past 1,024,
      // so the fourth must never be pulled.
      let pulled = 0;
      const state = { destroyed: false };
      const body = {
        destroy: () => {
          state.destroyed = true;
        },
        async *[Symbol.asyncIterator]() {
          for (let i = 0; i < 4; i += 1) {
            pulled += 1;
            yield Buffer.alloc(400);
          }
        },
      };
      vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body } as never);

      await expect(
        adapter.download('imports/p1/unknown-length.json', LIMIT)
      ).rejects.toBeInstanceOf(PayloadTooLargeError);

      expect(state.destroyed).toBe(true);
      expect(pulled).toBe(3);
    });

    it('accepts a streamed body of exactly maxBytes when no ContentLength is reported', async () => {
      const { body } = trackedBody([Buffer.alloc(512), Buffer.alloc(512)]);
      vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body } as never);

      expect((await adapter.download('imports/p1/streamed.json', LIMIT)).length).toBe(1024);
    });

    it('enforces the streamed count even when ContentLength understated the size', async () => {
      const { body } = trackedBody([Buffer.alloc(2048)]);
      vi.spyOn(shared(), 'send').mockResolvedValue({ Body: body, ContentLength: 10 } as never);

      await expect(adapter.download('imports/p1/liar.json', LIMIT)).rejects.toBeInstanceOf(
        PayloadTooLargeError
      );
    });

    it.each([0, -1, 1.5, Number.NaN])(
      'refuses a maxBytes of %s before calling S3',
      async (maxBytes) => {
        const send = vi.spyOn(shared(), 'send');

        await expect(adapter.download('imports/p1/u1.json', { maxBytes })).rejects.toBeInstanceOf(
          ValidationError
        );

        expect(send).not.toHaveBeenCalled();
      }
    );
  });

  it.each([
    ['NoSuchKey', httpError('NoSuchKey', 404)],
    ['a bare 404', Object.assign(new Error('missing'), { $metadata: { httpStatusCode: 404 } })],
  ])('maps %s to NotFoundError', async (_label, error) => {
    vi.spyOn(shared(), 'send').mockRejectedValue(error);

    await expect(adapter.download('imports/p1/gone.json', LIMIT)).rejects.toBeInstanceOf(
      NotFoundError
    );
  });

  it.each([
    ['AccessDenied', httpError('AccessDenied', 403)],
    ['InternalError', httpError('InternalError', 500)],
    ['a network failure', new Error('socket hang up')],
  ])('maps %s to a STORAGE_ERROR, not to NotFoundError', async (_label, error) => {
    // A 403 means the role cannot read the bucket. Reporting it as "not found"
    // would send an operator looking for an object that is there.
    vi.spyOn(shared(), 'send').mockRejectedValue(error);

    const outcome = await adapter
      .download('imports/p1/u1.json', LIMIT)
      .catch((caught: unknown) => caught);

    expect(outcome).toBeInstanceOf(GrantException);
    expect(outcome).not.toBeInstanceOf(NotFoundError);
    expect((outcome as GrantException).code).toBe('STORAGE_ERROR');
  });

  it('fails as a STORAGE_ERROR when S3 returns no body', async () => {
    vi.spyOn(shared(), 'send').mockResolvedValue({} as never);

    const outcome = await adapter
      .download('imports/p1/u1.json', LIMIT)
      .catch((caught: unknown) => caught);

    expect(outcome).toBeInstanceOf(GrantException);
    expect((outcome as GrantException).code).toBe('STORAGE_ERROR');
  });

  it('refuses a malformed path before calling S3', async () => {
    const send = vi.spyOn(shared(), 'send');

    await expect(adapter.download('imports/../other-tenant/u1.json', LIMIT)).rejects.toBeInstanceOf(
      ValidationError
    );
    await expect(adapter.download('/imports/p1/u1.json', LIMIT)).rejects.toBeInstanceOf(
      ValidationError
    );

    expect(send).not.toHaveBeenCalled();
  });
});
