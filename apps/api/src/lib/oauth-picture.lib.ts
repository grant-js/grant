const USER_PICTURE_URL_MAX_LENGTH = 500;

/**
 * Normalize an IdP profile photo into a persistable `users.pictureUrl`.
 * Accepts a string, protocol-relative URL, or `{ url }` (some userinfo shapes).
 */
export function normalizeOauthPictureUrl(raw: unknown): string | null {
  let value: unknown = raw;
  if (value && typeof value === 'object' && 'url' in value) {
    value = (value as { url: unknown }).url;
  }
  if (typeof value !== 'string') {
    return null;
  }

  let url = value.trim();
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }
  if (!/^https?:\/\//i.test(url)) {
    return null;
  }
  if (url.length > USER_PICTURE_URL_MAX_LENGTH) {
    return null;
  }
  return url;
}

export function oauthPictureUrlFromProviderData(
  providerData: Record<string, unknown>
): string | null {
  return normalizeOauthPictureUrl(providerData.avatarUrl);
}

export function userPictureUrlIsEmpty(pictureUrl: string | null | undefined): boolean {
  return !pictureUrl?.trim();
}
