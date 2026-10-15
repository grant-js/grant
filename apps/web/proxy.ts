import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  resolveOriginVerifyHeaderName,
  resolveOriginVerifySecret,
  shouldInjectOriginVerify,
} from '@/lib/origin-verify-proxy';
import { isStoragePath, proxiesStorageToApi } from '@/lib/storage-proxy';

/**
 * Next 16 Node proxy (replaces Edge middleware). Attaches `x-origin-verify` on
 * paths rewritten to the API. `next.config` rewrites cannot add headers.
 * No-op when `ORIGIN_VERIFY_SECRET` is unset (local default).
 *
 * `/storage/*` is answered 404 here, with an empty body, when the storage provider is not
 * `local`: the API serves that path only for the local provider, so there is nothing to
 * proxy to, and the rewrite would otherwise fail with a 500 where no API runs beside the
 * web app. See `lib/storage-proxy.ts`.
 */
export function proxy(request: NextRequest) {
  if (isStoragePath(request.nextUrl.pathname) && !proxiesStorageToApi()) {
    return new NextResponse(null, { status: 404 });
  }

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
