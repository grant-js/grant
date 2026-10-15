import { AccountType } from '@grantjs/schema';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

/**
 * The dashboard layout is the one place every dashboard page passes through, so it is
 * where a user who is signed in without an account (closed install) is kept off the
 * account-scoped pages. The API refuses those pages' data anyway; this keeps the console
 * from offering them -- and from sitting on "Loading account data..." for ever.
 */

const replace = vi.fn();
let mockPathname = '/dashboard';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('@/components/common', () => ({
  FullPageLoader: () => <div data-testid="full-page-loader" />,
  EmailVerificationBanner: () => null,
}));

vi.mock('@/hooks/accounts', async () => ({
  useAccountsSync: () => undefined,
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));

const { default: DashboardLayout } = await import('@/app/[locale]/dashboard/layout');

const account = { id: 'a1', type: AccountType.Personal } as never;

function signIn(accounts: never[], accountsLoaded = true) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded });
  });
}

function renderAt(pathname: string) {
  mockPathname = pathname;
  return render(
    <DashboardLayout>
      <div>page content</div>
    </DashboardLayout>
  );
}

beforeEach(() => {
  replace.mockClear();
  act(() => {
    useAuthStore.getState().clearAuth();
    useAuthStore.setState({ isSwitchingAccounts: false });
  });
});

describe('dashboard layout for a user with no account', () => {
  it.each([
    '/dashboard',
    '/dashboard/account',
    '/dashboard/settings/account',
    '/dashboard/organizations',
    '/dashboard/accounts/a-1/projects',
  ])('redirects %s to the project memberships page and renders none of it', (path) => {
    signIn([]);

    renderAt(path);

    expect(replace).toHaveBeenCalledWith('/dashboard/settings/projects');
    expect(screen.getByTestId('full-page-loader')).toBeInTheDocument();
    expect(screen.queryByText('page content')).not.toBeInTheDocument();
  });

  it.each([
    '/dashboard/settings',
    '/dashboard/settings/projects',
    '/dashboard/settings/profile',
    '/dashboard/settings/security',
    '/dashboard/settings/privacy',
    '/dashboard/notifications',
  ])('keeps the user-scoped page %s', (path) => {
    signIn([]);

    renderAt(path);

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});

describe('dashboard layout for everyone else', () => {
  it('does not touch a user who has an account', () => {
    signIn([account]);

    renderAt('/dashboard/accounts/a1/projects');

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('does not redirect while the server has not yet said whether there is an account', () => {
    signIn([], false);

    renderAt('/dashboard/organizations');

    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText('page content')).toBeInTheDocument();
  });
});
