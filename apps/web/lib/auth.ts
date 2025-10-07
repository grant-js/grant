import { AccountType } from '@logusgraphics/grant-schema';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  REFRESH_TOKEN_EXPIRATION_DAYS,
} from './constants';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
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
