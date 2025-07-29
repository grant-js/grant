import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

import { AUTH_TOKEN_KEY } from './constants';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  // Also set the cookie for server-side auth checks
  Cookies.set(AUTH_TOKEN_KEY, token, {
    expires: 7, // 7 days
    path: '/',
    sameSite: 'lax', // Changed to lax to allow redirects
    secure: process.env.NODE_ENV === 'production',
  });
}

export function removeStoredToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  // Also remove the cookie
  Cookies.remove(AUTH_TOKEN_KEY, { path: '/' });
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
  const token = getStoredToken();
  return token !== null && isTokenValid(token);
}

export function getDecodedToken(): JWTPayload | null {
  const token = getStoredToken();
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
  // Use Next.js router to preserve locale
  window.location.href = `/${locale}/auth/login`;
}
