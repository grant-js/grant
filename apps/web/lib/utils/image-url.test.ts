import { describe, expect, it } from 'vitest';

import { addImageCacheBuster } from './image-url';

describe('addImageCacheBuster', () => {
  it('adds a query parameter to a stable local path', () => {
    expect(addImageCacheBuster('/storage/users/1/picture.jpg', new Date(1_700_000_000_000))).toBe(
      '/storage/users/1/picture.jpg?v=1700000000000'
    );
  });

  it('appends to an existing query string on a local path', () => {
    expect(
      addImageCacheBuster('/storage/users/1/picture.jpg?x=1', new Date(1_700_000_000_000))
    ).toBe('/storage/users/1/picture.jpg?x=1&v=1700000000000');
  });

  it('leaves a SigV4 URL untouched, because an extra parameter breaks the signature', () => {
    // Avatar used to append `&v=<ms>` to every pictureUrl. After slice 17 the
    // derived URL is a presigned GET: S3 signs the exact query string, rejects
    // the mutated one with 403 application/xml, and Chrome ORB blocks that as
    // a non-image. The objects are in the bucket; the browser never receives
    // them. The `v=` on a real report is what this assertion forbids.
    const signed =
      'https://bucket.s3.eu-central-1.amazonaws.com/users/1/picture.jpg' +
      '?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA%2F20260913' +
      '&X-Amz-Date=20260913T095758Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host' +
      '&X-Amz-Signature=abc123';

    expect(addImageCacheBuster(signed, new Date(1_700_000_000_000))).toBe(signed);
  });

  it('returns undefined when there is no URL', () => {
    expect(addImageCacheBuster(undefined)).toBeUndefined();
    expect(addImageCacheBuster(null)).toBeUndefined();
    expect(addImageCacheBuster('')).toBeUndefined();
  });
});
