import { AUTH_ACCESS_TOKEN_KEY, AUTH_REFRESH_TOKEN_KEY } from '@logusgraphics/grant-constants';
import { AccountType } from '@logusgraphics/grant-schema';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

// Cookie expiration matches the refresh token expiration from API config
// Default to 30 days to match JWT_REFRESH_TOKEN_EXPIRATION_DAYS default
const REFRESH_TOKEN_EXPIRATION_DAYS =
  Number(process.env.NEXT_PUBLIC_REFRESH_TOKEN_EXPIRATION_DAYS) || 30;

interface JWTPayload {
  exp: number;
  sub: string;
  email?: string;
  jti?: string;
  aud?: string;
  iat?: number;
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  Cookies.set(AUTH_ACCESS_TOKEN_KEY, accessToken, {
    expires: REFRESH_TOKEN_EXPIRATION_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  Cookies.set(AUTH_REFRESH_TOKEN_KEY, refreshToken, {
    expires: REFRESH_TOKEN_EXPIRATION_DAYS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function removeStoredTokens(): void {
  Cookies.remove(AUTH_ACCESS_TOKEN_KEY, { path: '/' });
  Cookies.remove(AUTH_REFRESH_TOKEN_KEY, { path: '/' });
}

export function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  const accessToken = Cookies.get(AUTH_ACCESS_TOKEN_KEY) || null;
  const refreshToken = Cookies.get(AUTH_REFRESH_TOKEN_KEY) || null;
  return { accessToken, refreshToken };
}

export function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
}

export function getRedirectPath(
  accountType: AccountType,
  accountId: string,
  locale: string
): string {
  switch (accountType) {
    case AccountType.Personal:
      return `/${locale}/dashboard/accounts/${accountId}`;
    case AccountType.Organization:
      return `/${locale}/dashboard/organizations`;
    default:
      return `/${locale}/dashboard`;
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
