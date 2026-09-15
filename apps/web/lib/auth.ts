import { AccountType } from '@grantjs/schema';
import { jwtDecode } from 'jwt-decode';

export function isPublicPath(pathname: string): boolean {
  if (!pathname || pathname === '/') return false;
  return (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/invitations') ||
    pathname.startsWith('/forbidden') ||
    pathname.startsWith('/not-found')
  );
}

export function isAuthOnlyPath(pathname: string): boolean {
  if (!pathname || pathname === '/') return false;
  return (
    pathname.startsWith('/auth/login') ||
    pathname.startsWith('/auth/register') ||
    pathname.startsWith('/auth/forgot-password')
  );
}

/**
 * Dedicated login MFA challenge/enroll page. The in-app step-up dialog must not
 * open here — the page is already the challenge UI.
 *
 * Accepts locale-prefixed (`/en/auth/mfa`) and locale-stripped (`/auth/mfa`) paths.
 */
export function isMfaChallengePath(pathname: string): boolean {
  if (!pathname) return false;
  const path = pathname.split(/[?#]/)[0] ?? '';
  return /(?:^|\/)auth\/mfa(?:\/|$)/.test(path);
}

/** Header notification chrome issues AAL2 GraphQL; keep it off the public auth shell. */
export function shouldShowNotificationBell(pathname: string, authenticated: boolean): boolean {
  return authenticated && !isPublicPath(pathname);
}

/** In-app MFA dialog is for dashboard step-up, not the dedicated login challenge page. */
export function shouldOpenInAppMfaStepUp(pathname: string): boolean {
  return !isMfaChallengePath(pathname);
}

interface JWTPayload {
  exp: number;
  sub: string;
  email?: string;
  jti?: string;
  aud?: string;
  iat?: number;
}

export function getRedirectPath(accountType: AccountType, accountId: string): string {
  switch (accountType) {
    case AccountType.Personal:
      return `/dashboard/accounts/${accountId}`;
    case AccountType.Organization:
      return `/dashboard/organizations`;
    default:
      return `/dashboard`;
  }
}

export function getCurrentSessionId(accessToken: string): string | null {
  try {
    const decoded = jwtDecode<JWTPayload>(accessToken);
    return decoded.jti as string | null;
  } catch {
    return null;
  }
}

export function getCurrentUserId(accessToken: string): string | null {
  try {
    const decoded = jwtDecode<JWTPayload>(accessToken);
    return decoded.sub as string | null;
  } catch {
    return null;
  }
}
