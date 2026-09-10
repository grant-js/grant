import type { S3Client } from '@aws-sdk/client-s3';
import { noopLogger } from '@grantjs/core';
import { describe, expect, it } from 'vitest';

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
 * against a real bucket, on slice 16's deploy. See ADR 0006.
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
