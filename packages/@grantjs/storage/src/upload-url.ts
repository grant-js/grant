import type { UploadUrlOptions } from '@grantjs/core';
import { ValidationError } from '@grantjs/core';

/**
 * SigV4's own ceiling for a presigned URL. The local adapter has no reason to
 * exceed what the object store cannot, so the port bounds both the same way.
 */
const MAX_UPLOAD_URL_EXPIRY_SECONDS = 604_800;

/**
 * The commitments in a presigned URL are only as good as the path they are bound
 * to, and `getUploadUrl` is the first storage call whose argument a client ever
 * sees. Both adapters run this before minting, so the shared conformance suite can
 * assert the refusals without knowing which adapter it is talking to.
 */
export function assertUploadPath(path: string): void {
  if (!path) {
    throw new ValidationError('Storage path is required');
  }

  if (path.startsWith('/') || path.startsWith('\\')) {
    throw new ValidationError(`Storage path must be relative: ${path}`);
  }

  const segments = path.split(/[/\\]/);

  for (const segment of segments) {
    if (segment === '') {
      throw new ValidationError(`Storage path has an empty segment: ${path}`);
    }
    if (segment === '.' || segment === '..') {
      throw new ValidationError(`Storage path may not traverse directories: ${path}`);
    }
    // Dot-prefixed segments are refused for one specific reason: the local adapter
    // keeps its signing key at `<basePath>/.grant-upload-key`, and a mint for that
    // path would hand out a capability to overwrite the key that authorizes every
    // other mint. `express.static`'s `dotfiles: 'deny'` stops it being *read*; this
    // stops it being written. See ADR 0007 § Notes for the security review.
    if (segment.startsWith('.')) {
      throw new ValidationError(`Storage path may not contain a dot-prefixed segment: ${path}`);
    }
  }
}

function assertUploadUrlOptions(options: UploadUrlOptions): void {
  const { contentLength, contentType, expiresInSeconds } = options;

  if (!Number.isInteger(contentLength) || contentLength <= 0) {
    throw new ValidationError(
      `Upload contentLength must be a positive integer, received: ${contentLength}`
    );
  }

  if (!contentType) {
    throw new ValidationError('Upload contentType is required');
  }

  if (
    !Number.isInteger(expiresInSeconds) ||
    expiresInSeconds < 1 ||
    expiresInSeconds > MAX_UPLOAD_URL_EXPIRY_SECONDS
  ) {
    throw new ValidationError(
      `Upload expiresInSeconds must be an integer in [1, ${MAX_UPLOAD_URL_EXPIRY_SECONDS}], ` +
        `received: ${expiresInSeconds}`
    );
  }
}

export function assertUploadTarget(path: string, options: UploadUrlOptions): void {
  assertUploadPath(path);
  assertUploadUrlOptions(options);
}
