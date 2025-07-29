import { jwtDecode } from 'jwt-decode';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_TOKEN_KEY } from '@/lib/constants';

interface JWTPayload {
  exp: number;
  sub: string;
  email: string;
}

// Get the locale from the pathname
function getLocaleFromPath(path: string): string {
  const firstSegment = path.split('/')[1];
  // List of supported locales - should match your app's config
  const supportedLocales = ['en', 'de'];
  return supportedLocales.includes(firstSegment) ? firstSegment : 'en';
}

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the pathname of the request (e.g. /, /dashboard)
  const path = request.nextUrl.pathname;
  const locale = getLocaleFromPath(path);

  // Check if the path is a static file
  const isStaticFile =
    /\.(jpg|jpeg|png|gif|svg|ico|webp|mp4|webm|ogg|mp3|wav|pdf|txt|css|js)$/i.test(path);

  // Public paths that don't require authentication
  const isPublicPath =
    path.startsWith(`/${locale}/auth`) ||
    path === '/' ||
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    isStaticFile;

  // Get the token from the cookies
  const token = request.cookies.get(AUTH_TOKEN_KEY)?.value;

  // Check if the token is valid
  const isTokenValid = token ? isValidToken(token) : false;

  // If the path requires authentication and no valid token exists,
  // redirect to the login page with locale prefix
  if (!isPublicPath && !isTokenValid) {
    const loginUrl = new URL(`/${locale}/auth/login`, request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }

  // If the user is logged in and tries to access login page,
  // redirect to dashboard with locale prefix
  if (isTokenValid && path.includes('/auth')) {
    const currentLocale = getLocaleFromPath(path);
    return NextResponse.redirect(new URL(`/${currentLocale}/dashboard`, request.url));
  }

  // If accessing root path (/), redirect to the locale-prefixed dashboard or login page
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

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
