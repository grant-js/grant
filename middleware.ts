import { jwtDecode } from 'jwt-decode';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_ACCESS_TOKEN_KEY } from '@/lib/constants';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
}

function getLocaleFromPath(path: string): string {
  const firstSegment = path.split('/')[1];
  const supportedLocales = ['en', 'de'];
  return supportedLocales.includes(firstSegment) ? firstSegment : 'en';
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locale = getLocaleFromPath(path);

  const isStaticFile =
    /\.(jpg|jpeg|png|gif|svg|ico|webp|mp4|webm|ogg|mp3|wav|pdf|txt|css|js)$/i.test(path);

  const isPublicPath =
    path.startsWith(`/${locale}/auth`) ||
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    isStaticFile;

  const accessToken = request.cookies.get(AUTH_ACCESS_TOKEN_KEY)?.value;

  const isTokenValid = accessToken ? isValidToken(accessToken) : false;

  if (!isPublicPath && !isTokenValid) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  if (isTokenValid && path.includes('/auth')) {
    const currentLocale = getLocaleFromPath(path);
    return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url));
  }

  if (path === '/') {
    const defaultLocale = 'en';
    if (isTokenValid) {
      return NextResponse.redirect(new URL(`/${defaultLocale}/dashboard`, request.url));
    } else {
      return NextResponse.redirect(new URL(`/${defaultLocale}/auth/login`, request.url));
    }
  }

  return NextResponse.next();
}

function isValidToken(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp > currentTime;
  } catch {
    return false;
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
