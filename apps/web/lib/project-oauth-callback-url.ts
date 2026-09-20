/**
 * Grant broker callback URL operators register on their GitHub/Google OAuth app.
 * Same path for both providers; defaults match API env (`…/api/auth/project/callback`).
 */
export function getProjectOAuthBrokerCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/project/callback`;
  }
  return '/api/auth/project/callback';
}
