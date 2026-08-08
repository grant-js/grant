// @vitest-environment jsdom

import { createElement } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

import { SessionRestoreGate } from './session-restore-gate';

/**
 * Characterization tests for the sole client-side auth gate: no Next.js `middleware.ts`
 * exists in this app, so `SessionRestoreGate` (wrapping the whole tree) is the only thing
 * deciding whether protected page content renders. It has zero prior test coverage and an
 * effect-driven state machine — the same shape (untested, high blast radius, state-machine
 * complexity) as pass 1's `CacheHandler` finding. These tests assert *current* behavior,
 * including a race identified while writing them (see the "stale restoreStatus" describe
 * block) — they do not fix it.
 *
 * Written with `React.createElement` instead of JSX: `apps/web/vitest.config.ts` has no
 * `@vitejs/plugin-react` (or jsx-transforming esbuild option), and the root `tsconfig.json`
 * sets `"jsx": "preserve"`, so `.tsx` test files containing real JSX fail to parse under the
 * current harness. See the coverage report for this as a standalone finding — every existing
 * `.test.tsx` file in this app happens to contain no JSX (hook-only tests via `renderHook`),
 * so this has not been hit before.
 */

const routerPush = vi.fn();
let mockPathname = '/dashboard';
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: routerPush }),
}));

const logoutSession = vi.fn(async () => {});
vi.mock('@/lib/apollo-client', () => ({
  logoutSession: () => logoutSession(),
}));

const refreshSessionViaCookie = vi.fn(async () => false);
vi.mock('@/lib/refresh-session', () => ({
  refreshSessionViaCookie: () => refreshSessionViaCookie(),
}));

vi.mock('@/components/common', () => ({
  FullPageLoader: () => createElement('div', { 'data-testid': 'full-page-loader' }),
}));

function renderGate(children: string) {
  return render(createElement(SessionRestoreGate, null, createElement('div', null, children)));
}

function resetAuthStore() {
  act(() => {
    useAuthStore.setState({
      accounts: [],
      currentAccountId: null,
      isSwitchingAccounts: false,
      accessToken: null,
      email: null,
      mfaVerified: false,
      requiresEmailVerification: false,
      verificationExpiry: null,
    });
  });
}

describe('SessionRestoreGate', () => {
  beforeEach(() => {
    mockPathname = '/dashboard';
    mockSearchParams.forEach((_v, k) => mockSearchParams.delete(k));
    routerPush.mockClear();
    logoutSession.mockClear();
    refreshSessionViaCookie.mockReset();
    refreshSessionViaCookie.mockImplementation(async () => false);
    resetAuthStore();
    sessionStorage.clear();
  });

  afterEach(() => {
    resetAuthStore();
  });

  it('renders children immediately when already authenticated on a protected path, without restoring', async () => {
    act(() => {
      useAuthStore.getState().setAccessToken('token-abc');
    });

    renderGate('protected content');

    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(refreshSessionViaCookie).not.toHaveBeenCalled();
  });

  it('shows a loader and attempts cookie restore when unauthenticated on a protected path', async () => {
    let resolveRestore: (v: boolean) => void = () => {};
    refreshSessionViaCookie.mockImplementation(
      () => new Promise<boolean>((resolve) => (resolveRestore = resolve))
    );

    renderGate('protected content');

    expect(screen.getByTestId('full-page-loader')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(refreshSessionViaCookie).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRestore(false);
      await Promise.resolve();
    });
  });

  it('renders protected content once cookie restore succeeds', async () => {
    refreshSessionViaCookie.mockImplementation(async () => {
      // Mirrors the real implementation: the store is updated as a side effect
      // of the promise resolving, before the caller's `.then` runs.
      useAuthStore.getState().setAccessToken('restored-token');
      return true;
    });

    renderGate('protected content');

    await waitFor(() => expect(screen.getByText('protected content')).toBeInTheDocument());
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('logs out and redirects to /auth/login when restore fails on a protected path', async () => {
    refreshSessionViaCookie.mockImplementation(async () => false);

    renderGate('protected content');

    await waitFor(() => expect(logoutSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/auth/login'));
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders the login form (no loader, no logout/redirect loop) when unauthenticated on a public path', async () => {
    mockPathname = '/auth/login';

    renderGate('login form');

    // Restore still fires once (any page, including /auth/login, per the source comment) ...
    expect(refreshSessionViaCookie).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('login form')).toBeInTheDocument());
    // ... but failure on a public path must not trigger the logout+redirect flow.
    expect(logoutSession).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows a loader then self-redirects to the default dashboard when auth flips true while still on an auth-only path', async () => {
    mockPathname = '/auth/login';

    const { rerender } = renderGate('protected content');

    act(() => {
      useAuthStore.getState().setAccessToken('token-abc');
    });
    rerender(
      createElement(SessionRestoreGate, null, createElement('div', null, 'protected content'))
    );

    // The SPA-navigation effect's "did pathname change" check compares against a ref that is
    // only ever written once the gate is `settled` (`auth || restoreStatus is done/failed`).
    // Before that it stays at its initial `null`, so the *first* settled render always reads
    // as "changed" regardless of whether `pathname` actually moved — which is what makes the
    // gate self-heal here without the login page's own `router.push` (see the `login/page.tsx`
    // caller, which also does this independently). No `?redirect=` was stored, so it falls
    // back to `DEFAULT_AUTH_REDIRECT`.
    expect(screen.getByTestId('full-page-loader')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(routerPush).toHaveBeenCalledWith('/dashboard');
  });

  describe('a bare clearAuth() on a protected path (no accompanying server-side logout)', () => {
    /**
     * All real call sites of `clearAuth()` in this app (`sidebar-account-dropdown.tsx`,
     * `use-my-mutations.ts`, `security/page.tsx`, `use-privacy-settings.ts`) call a
     * session-revoking mutation first, so the refresh cookie is normally already dead by the
     * time `clearAuth()` runs. The gate itself does not enforce that ordering, and cannot
     * observe it — it decides purely from `restoreStatus`/`accessToken`. These two tests
     * characterize what happens for each of the two ways the *next* cookie-restore attempt
     * can resolve.
     */

    it('DEFECT-SHAPED: silently re-authenticates the user if the refresh cookie is still valid when clearAuth() runs', async () => {
      // Drive restoreStatus to 'done' via a successful cookie restore, as would happen on a
      // page reload while a valid refresh cookie exists. Kept succeeding on every call is the
      // point: it stands in for "the cookie was never actually revoked" (e.g. `clearAuth()`
      // called without a preceding logout mutation, or the mutation targeted a different
      // session/device than the one the refresh cookie is bound to).
      refreshSessionViaCookie.mockImplementation(async () => {
        useAuthStore.getState().setAccessToken('restored-token');
        return true;
      });

      renderGate('protected content');
      await waitFor(() => expect(screen.getByText('protected content')).toBeInTheDocument());
      expect(refreshSessionViaCookie).toHaveBeenCalledTimes(1);

      // Simulate a bare `clearAuth()` (no server-side revoke) without a full page reload.
      // `restoreStatus` is internal component state and was left at 'done' by the restore
      // above; only a `useEffect` (queued via `queueMicrotask`) resets it, and until it does,
      // render branch `restoreStatus === 'done' && !publicPath` does not also require `auth`.
      act(() => {
        useAuthStore.getState().clearAuth();
      });

      // Immediately after the synchronous state flip: `auth` is false but `restoreStatus` is
      // still stale 'done', so the gate keeps rendering the protected subtree for at least
      // one pass instead of falling back to a loader.
      expect(screen.getByText('protected content')).toBeInTheDocument();
      expect(screen.queryByTestId('full-page-loader')).not.toBeInTheDocument();

      // Flushing the queued microtask resets `restoreStatus` to 'idle'. That is itself a
      // dependency of the restore-trigger effect, so it fires again — and because the mock
      // keeps succeeding (cookie still valid), the gate re-authenticates the user with a new
      // access token instead of ever reaching the login screen. `clearAuth()` did not "stick".
      await waitFor(() => expect(refreshSessionViaCookie).toHaveBeenCalledTimes(2));
      expect(screen.getByText('protected content')).toBeInTheDocument();
      expect(useAuthStore.getState().accessToken).toBe('restored-token');
    });

    it('reaches the login screen when the refresh cookie has actually been revoked before clearAuth()', async () => {
      let restoreCalls = 0;
      refreshSessionViaCookie.mockImplementation(async () => {
        restoreCalls += 1;
        if (restoreCalls === 1) {
          useAuthStore.getState().setAccessToken('restored-token');
          return true;
        }
        // Second attempt (after the post-clearAuth() re-trigger): cookie was revoked server-side.
        return false;
      });

      renderGate('protected content');
      await waitFor(() => expect(screen.getByText('protected content')).toBeInTheDocument());

      act(() => {
        useAuthStore.getState().clearAuth();
      });

      await waitFor(() => expect(refreshSessionViaCookie).toHaveBeenCalledTimes(2));
      await waitFor(() => expect(logoutSession).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/auth/login'));
      expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    });
  });
});
