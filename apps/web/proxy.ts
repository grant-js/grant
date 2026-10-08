import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  resolveOriginVerifyHeaderName,
  resolveOriginVerifySecret,
  shouldInjectOriginVerify,
} from '@/lib/origin-verify-proxy';

/**
 * Next 16 Node proxy (replaces Edge middleware). Attaches `x-origin-verify` on
 * paths rewritten to the API. `next.config` rewrites cannot add headers.
 * No-op when `ORIGIN_VERIFY_SECRET` is unset (local default).
 */
export function proxy(request: NextRequest) {
  const secret = resolveOriginVerifySecret();
  if (!secret || !shouldInjectOriginVerify(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set(resolveOriginVerifyHeaderName(), secret);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    { source: '/api/:path*', locale: false },
    { source: '/graphql', locale: false },
    { source: '/graphql/:path*', locale: false },
    { source: '/health', locale: false },
    { source: '/storage/:path*', locale: false },
    { source: '/.well-known/:path*', locale: false },
    { source: '/org/:path*', locale: false },
    { source: '/acc/:path*', locale: false },
  ],
};
