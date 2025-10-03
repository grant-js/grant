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

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export function setStoredTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
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

export function removeStoredToken(): void {
  localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
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

export function isAuthenticated(): boolean {
  const token = getStoredAccessToken();
  return token !== null && isTokenValid(token);
}

export function getDecodedToken(): JWTPayload | null {
  const token = getStoredAccessToken();
  if (!token) return null;

  try {
    return jwtDecode<JWTPayload>(token);
  } catch {
    return null;
  }
}

export function getCurrentLocale(): string {
  if (typeof window === 'undefined') return 'en';
  const path = window.location.pathname;
  const firstSegment = path.split('/')[1];
  const supportedLocales = ['en', 'de'];
  return supportedLocales.includes(firstSegment) ? firstSegment : 'en';
}

export function logout(): void {
  removeStoredToken();
  const locale = getCurrentLocale();
  window.location.href = `/${locale}/auth/login`;
}
