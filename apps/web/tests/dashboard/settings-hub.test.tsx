import { AccountType } from '@grantjs/schema';
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

const replace = vi.fn();
let mockPathname = '/dashboard/settings';

vi.mock('@/i18n/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock('@/hooks/accounts', async () => ({
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));

const { default: SettingsPage } = await import('@/app/[locale]/dashboard/settings/page');

const account = { id: 'a1', type: AccountType.Personal } as never;

function signIn(accounts: never[], accountsLoaded = true) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded });
  });
}

beforeEach(() => {
  replace.mockClear();
  mockPathname = '/dashboard/settings';
  act(() => {
    useAuthStore.getState().clearAuth();
  });
});

describe('the settings hub', () => {
  it('sends a user with an account to the account page', () => {
    signIn([account]);

    render(<SettingsPage />);

    expect(replace).toHaveBeenCalledWith('/dashboard/settings/account');
  });

  it('sends an account-less user to the project memberships page instead', () => {
    signIn([]);

    render(<SettingsPage />);

    expect(replace).toHaveBeenCalledWith('/dashboard/settings/projects');
  });

  it('waits until it is known whether there is an account', () => {
    signIn([], false);

    render(<SettingsPage />);

    expect(replace).not.toHaveBeenCalled();
  });

  it('only redirects from the hub itself', () => {
    mockPathname = '/dashboard/settings/profile';
    signIn([]);

    render(<SettingsPage />);

    expect(replace).not.toHaveBeenCalled();
  });
});
