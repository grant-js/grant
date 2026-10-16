import { AccountType } from '@grantjs/schema';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/hooks/accounts', async () => ({
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));

// The list of entries is what is under test, not how the sidebar draws them.
vi.mock('./dashboard-sidebar', () => ({
  DashboardSidebar: ({ groups }: { groups: Array<{ items: Array<{ url: string }> }> }) => (
    <ul>
      {groups
        .flatMap((group) => group.items)
        .map((item) => (
          <li key={item.url}>{item.url}</li>
        ))}
    </ul>
  ),
}));

const { SettingsSidebar } = await import('./settings-sidebar');

const account = { id: 'a1', type: AccountType.Personal } as never;

function signIn(accounts: never[], accountsLoaded = true) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded });
  });
}

beforeEach(() => {
  act(() => {
    useAuthStore.getState().clearAuth();
  });
});

describe('SettingsSidebar', () => {
  it('lists the Account entry for a user with an account', () => {
    signIn([account]);

    render(<SettingsSidebar />);

    expect(screen.getByText('/dashboard/settings/account')).toBeInTheDocument();
  });

  it('hides the Account entry for an account-less user and keeps the user-scoped ones', () => {
    signIn([]);

    render(<SettingsSidebar />);

    expect(screen.queryByText('/dashboard/settings/account')).not.toBeInTheDocument();
    for (const url of [
      '/dashboard/settings/profile',
      '/dashboard/settings/projects',
      '/dashboard/settings/security',
      '/dashboard/settings/preferences',
      '/dashboard/settings/notifications',
      '/dashboard/settings/privacy',
    ]) {
      expect(screen.getByText(url)).toBeInTheDocument();
    }
  });

  it('keeps the Account entry until the server has said there is no account', () => {
    signIn([], false);

    render(<SettingsSidebar />);

    expect(screen.getByText('/dashboard/settings/account')).toBeInTheDocument();
  });
});
