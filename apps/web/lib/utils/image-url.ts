/**
 * Adds a cache-busting query parameter to a stable image URL.
 *
 * Presigned object-store URLs are left alone: SigV4 signs the exact query
 * string, so `&v=` turns a working GET into `403 SignatureDoesNotMatch`. The
 * browser then receives `application/xml` for an `<img>` and Chrome reports
 * OpaqueResponseBlocking. Local `/storage/...` paths stay cache-busted —
 * those URLs do not change when the bytes do.
 */
export function addImageCacheBuster(
  url: string | null | undefined,
  timestamp?: string | Date | null
): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/[?&]x-amz-signature=/i.test(url)) {
    return url;
  }

  const cacheBuster = timestamp
    ? typeof timestamp === 'string'
      ? new Date(timestamp).getTime()
      : timestamp.getTime()
    : Date.now();

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${cacheBuster}`;
}
