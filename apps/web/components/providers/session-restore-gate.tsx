'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { FullPageLoader } from '@/components/common';
import { usePathname, useRouter } from '@/i18n/navigation';
import { logoutSession } from '@/lib/apollo-client';
import { isAuthOnlyPath, isPublicPath } from '@/lib/auth';
import { AUTH_REDIRECT_STORAGE_KEY, getAuthRedirectUrl, validateRedirectUrl } from '@/lib/redirect';
import { refreshSessionViaCookie } from '@/lib/refresh-session';
import { useAuthStore } from '@/stores/auth.store';

const clearAuth = () => useAuthStore.getState().clearAuth();

type RestoreStatus = 'idle' | 'pending' | 'done' | 'failed';

interface SessionRestoreGateProps {
  children: React.ReactNode;
}

const DEFAULT_AUTH_REDIRECT = '/dashboard';

/**
 * Single place for auth state on load/refresh: runs one-time session restore (cookie
 * refresh) when not authenticated, shows full-page loader until we know auth state,
 * then either redirects or renders. Never shows login form when user is authenticated
 * (redirects to dashboard with loader). Uses the same refreshSessionViaCookie() as
 * Apollo, Grant client, and useAccountsSync.
 */
export function SessionRestoreGate({ children }: SessionRestoreGateProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [restoreStatus, setRestoreStatus] = useState<RestoreStatus>('idle');
  const redirectStoredRef = useRef(false);
  const redirectToLoginStartedRef = useRef(false);
  const prevPathnameRef = useRef<string | null>(null);
  // Set once auth is ever true this mount. Distinguishes a cold boot (never
  // authenticated yet, restoreStatus naturally starts 'idle') from an explicit
  // clearAuth() during an existing session — accessToken is in-memory only, so
  // clearAuth() is the only way auth can go true -> false without a remount.
  const hadAuthRef = useRef(false);

  const auth = !!accessToken;
  const publicPath = isPublicPath(pathname);
  const settled = auth || restoreStatus === 'done' || restoreStatus === 'failed';

  // Persist ?redirect= on public path so we have it when redirecting (auth layout may never mount)
  useEffect(() => {
    if (!publicPath) return;
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && !redirectStoredRef.current) {
      const validated = validateRedirectUrl(redirectParam);
      if (validated) {
        sessionStorage.setItem(AUTH_REDIRECT_STORAGE_KEY, validated);
        redirectStoredRef.current = true;
      }
    }
  }, [publicPath, searchParams]);

  // Reset when auth is true so we can redirect to login again in future
  useEffect(() => {
    if (auth) {
      redirectToLoginStartedRef.current = false;
      hadAuthRef.current = true;
    }
  }, [auth]);

  // Reset stale 'done' when auth goes away so we show login instead of loader.
  // If we were previously authenticated this mount, this is an explicit logout
  // (clearAuth() is the only way accessToken goes true -> false without a
  // remount) — go straight to 'failed' rather than 'idle', so we do NOT re-arm
  // the cold-boot cookie-restore effect below and silently re-authenticate the
  // user off a refresh cookie nobody asked us to check again. 'failed' routes
  // through the existing logout+redirect effect, which also revokes the cookie
  // server-side regardless of whether the caller already did.
  useEffect(() => {
    if (auth || restoreStatus !== 'done') return;
    queueMicrotask(() => setRestoreStatus(hadAuthRef.current ? 'failed' : 'idle'));
  }, [auth, restoreStatus]);

  // One-time restore when not auth (any page, including /auth/login) — only
  // ever attempted before this mount has seen a real auth state, i.e. cold boot.
  useEffect(() => {
    if (auth) return;
    if (hadAuthRef.current) return;
    if (restoreStatus !== 'idle') return;

    queueMicrotask(() => setRestoreStatus('pending'));
    refreshSessionViaCookie().then((restored) => {
      setRestoreStatus(restored ? 'done' : 'failed');
    });
  }, [auth, restoreStatus]);

  // Page load: after restore failed on protected path and we're still not auth, clear server session then redirect to login.
  // (If we're auth e.g. after login, do not redirect — restoreStatus can still be 'failed' from when we were on the login page.)
  useEffect(() => {
    if (restoreStatus !== 'failed' || publicPath || auth) return;
    if (redirectToLoginStartedRef.current) return;
    redirectToLoginStartedRef.current = true;
    let cancelled = false;
    logoutSession().then(() => {
      if (!cancelled) {
        clearAuth();
        router.push('/auth/login');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [restoreStatus, publicPath, auth, router]);

  // SPA route change: redirect only when pathname changed and (path, auth) is invalid
  useEffect(() => {
    if (!settled) return;
    const pathnameChanged = prevPathnameRef.current !== pathname;
    prevPathnameRef.current = pathname;

    if (!pathnameChanged) return;

    if (publicPath && auth && isAuthOnlyPath(pathname)) {
      const target = getAuthRedirectUrl() ?? DEFAULT_AUTH_REDIRECT;
      router.push(target);
    } else if (!publicPath && !auth) {
      router.push('/auth/login');
    }
  }, [pathname, publicPath, auth, settled, router]);

  // Authenticated on protected path: render
  if (auth && !publicPath) return <>{children}</>;

  // Public path + authenticated: show loader only when we will redirect (auth-only paths)
  if (publicPath && auth && isAuthOnlyPath(pathname)) return <FullPageLoader />;

  // Public path + authenticated but not auth-only (e.g. verify-email, invitations): render so user can complete flow
  if (publicPath && auth) return <>{children}</>;

  // Not authenticated: show loader until restore settles
  if (!auth && (restoreStatus === 'pending' || restoreStatus === 'idle')) {
    return <FullPageLoader />;
  }

  // Restore done on protected path: render. Requires `auth` too so a render
  // right after clearAuth() (accessToken already false, restoreStatus not yet
  // reset by the effect above) falls through to the loader instead of keeping
  // stale protected content on screen for a frame.
  if (auth && restoreStatus === 'done' && !publicPath) return <>{children}</>;

  // Public path + not authenticated (restore failed or stale 'done' after logout): show login
  if (publicPath && !auth) return <>{children}</>;

  // Restore failed on protected path: redirect to login (effect above handles it)
  return <FullPageLoader />;
}
