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

const GOOGLE_CONSUMER_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Whether Google is authoritative for a verified address: a Gmail address, or an address in
 * the Workspace domain Google names in `hd`. `email_verified` alone can describe an outside
 * address a Google account verified once, possibly long ago, so it is not enough to claim an
 * existing unverified identity.
 */
export function isGoogleEmailAuthoritative(
  email: string | null | undefined,
  emailVerified: boolean,
  hostedDomain: string | null | undefined
): boolean {
  const emailNorm = normalizeVerifiedContactEmail(email, emailVerified);
  if (!emailNorm) {
    return false;
  }
  const domain = emailNorm.slice(emailNorm.lastIndexOf('@') + 1);
  if (GOOGLE_CONSUMER_DOMAINS.has(domain)) {
    return true;
  }
  return typeof hostedDomain === 'string' && hostedDomain.trim().toLowerCase() === domain;
}
