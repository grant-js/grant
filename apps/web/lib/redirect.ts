/**
 * Validates that a redirect URL is safe (internal only, no external redirects)
 * @param url - The URL to validate
 * @param locale - The current locale
 * @returns The validated URL or null if invalid
 */
export function validateRedirectUrl(url: string | null, locale: string): string | null {
  if (!url) return null;

  try {
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(url);

    // Must start with / to be an internal path
    if (!decodedUrl.startsWith('/')) {
      return null;
    }

    // Must start with the locale prefix
    if (!decodedUrl.startsWith(`/${locale}/`)) {
      return null;
    }

    // Don't allow redirecting to auth pages (except specific ones like invitations)
    if (decodedUrl.includes('/auth/') && !decodedUrl.includes('/invitations/')) {
      return null;
    }

    // Don't allow protocol-relative or absolute URLs
    if (decodedUrl.includes('://') || decodedUrl.startsWith('//')) {
      return null;
    }

    return decodedUrl;
  } catch {
    return null;
  }
}
