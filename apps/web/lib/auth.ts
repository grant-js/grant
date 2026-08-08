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
