/** SessionStorage key for post-login redirect URL (used by SessionRestoreGate and auth layout). */
export const AUTH_REDIRECT_STORAGE_KEY = 'auth_redirect_url';

export function getAuthRedirectUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const url = sessionStorage.getItem(AUTH_REDIRECT_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_REDIRECT_STORAGE_KEY);
  return url;
}

/**
 * Validates that a redirect URL is safe (internal only, no external redirects)
 * @param url - The URL to validate
 * @param locale - The current locale
 * @returns The validated URL or null if invalid
 */
export function validateRedirectUrl(url: string | null): string | null {
  if (!url) return null;

  try {
    // Decode the URL if it's encoded
    const decodedUrl = decodeURIComponent(url);

    // Must start with / to be an internal path
    if (!decodedUrl.startsWith('/')) {
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

export function getInvitationTokenFromRedirectUrl(url: string | null): string | null {
  const validatedUrl = validateRedirectUrl(url);
  if (!validatedUrl) return null;

  const [pathname] = validatedUrl.split(/[?#]/);
  const segments = pathname.split('/').filter(Boolean);
  const invitationIndex = segments.indexOf('invitations');

  if (invitationIndex === -1 || invitationIndex > 1) {
    return null;
  }

  return segments[invitationIndex + 1] || null;
}

export function getInvitationProofFromRedirectUrl(
  url: string | null
): { token: string; emailProofToken: string } | null {
  const validatedUrl = validateRedirectUrl(url);
  const token = getInvitationTokenFromRedirectUrl(validatedUrl);
  if (!validatedUrl || !token) return null;

  const [, queryString = ''] = validatedUrl.split('?');
  const searchParams = new URLSearchParams(queryString.split('#')[0]);
  const emailProofToken = searchParams.get('emailProof');

  if (!emailProofToken) {
    return null;
  }

  return { token, emailProofToken };
}
