import { AccountType } from '@grantjs/schema';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/hooks', () => ({
  useMyMutations: () => ({ logoutMyUser: vi.fn() }),
}));

vi.mock('@/hooks/accounts', async () => ({
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Menus render closed in the real component; here they render open so entries can be read.
vi.mock('@/components/common', () => {
  const Passthrough = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    Avatar: () => null,
    SidebarDropdownMenu: Passthrough,
    SidebarDropdownMenuContent: Passthrough,
    SidebarDropdownMenuGroup: Passthrough,
    SidebarDropdownMenuItem: Passthrough,
    SidebarDropdownMenuLabel: Passthrough,
    SidebarDropdownMenuSeparator: () => null,
    SidebarDropdownMenuTrigger: Passthrough,
  };
});

const { SidebarAccountDropdown } = await import('./sidebar-account-dropdown');

const account = { id: 'a1', type: AccountType.Personal } as never;

function signIn(accounts: never[], accountsLoaded = true) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded });
  });
}

const hrefs = () => screen.getAllByRole('link').map((link) => link.getAttribute('href'));

beforeEach(() => {
  act(() => {
    useAuthStore.getState().clearAuth();
  });
});

describe('SidebarAccountDropdown', () => {
  it('links the Account settings page for a user with an account', () => {
    signIn([account]);

    render(<SidebarAccountDropdown />);

    expect(hrefs()).toContain('/dashboard/settings/account');
  });

  it('hides the Account entry for an account-less user, and keeps the rest and Logout', () => {
    signIn([]);

    render(<SidebarAccountDropdown />);

    expect(hrefs()).not.toContain('/dashboard/settings/account');
    expect(hrefs()).toEqual([
      '/dashboard/settings/profile',
      '/dashboard/settings/projects',
      '/dashboard/settings/security',
      '/dashboard/settings/preferences',
      '/dashboard/settings/privacy',
    ]);
    expect(screen.getByText('common.auth.logout')).toBeInTheDocument();
  });
});
