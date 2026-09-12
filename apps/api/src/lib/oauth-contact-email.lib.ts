/**
 * Normalize an IdP mailbox for a passwordless Email authentication method.
 * Returns null when the address is missing or the IdP did not mark it verified.
 */
export function normalizeVerifiedContactEmail(
  email: string | null | undefined,
  emailVerified: boolean
): string | null {
  if (!emailVerified) {
    return null;
  }
  if (typeof email !== 'string') {
    return null;
  }
  const emailNorm = email.trim().toLowerCase();
  if (!emailNorm.includes('@')) {
    return null;
  }
  return emailNorm;
}

export function contactEmailFromOAuthProviderData(providerData: Record<string, unknown>): {
  email: string;
  emailVerified: boolean;
} {
  const email = typeof providerData.email === 'string' ? providerData.email : null;
  return {
    email: email ?? '',
    emailVerified: providerData.emailVerified === true,
  };
}
