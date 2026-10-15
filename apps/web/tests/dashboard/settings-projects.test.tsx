import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

let mockPolicy = { publicSignupEnabled: false, bootstrapOpen: false, loading: false };

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/hooks/accounts', async () => ({
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));
vi.mock('@/hooks/auth', () => ({ useAuthSignupPolicy: () => mockPolicy }));
vi.mock('@/hooks/common', () => ({ usePageTitle: () => undefined }));
vi.mock('@/hooks/me', () => ({
  useMyProjectMemberships: () => ({ memberships: [], loading: false }),
}));

vi.mock('@/components/layout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/navigation', () => ({ SettingsSidebar: () => null }));
vi.mock('@/components/features/settings', async () => ({
  SettingProjectMembershipsList: () => <div>memberships list</div>,
  SettingNoWorkspaceNotice: (
    await import('@/components/features/settings/setting-no-workspace-notice')
  ).SettingNoWorkspaceNotice,
}));

const { default: ProjectMembershipsSettingsPage } =
  await import('@/app/[locale]/dashboard/settings/projects/page');

const NOTICE = 'settings.projectMemberships.noWorkspace.description';

function signIn(accounts: never[]) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded: true });
  });
}

beforeEach(() => {
  mockPolicy = { publicSignupEnabled: false, bootstrapOpen: false, loading: false };
  act(() => {
    useAuthStore.getState().clearAuth();
  });
});

describe('project memberships page', () => {
  it('tells an account-less user on a closed install that they have no workspace', () => {
    signIn([]);

    render(<ProjectMembershipsSettingsPage />);

    expect(screen.getByText(NOTICE)).toBeInTheDocument();
    expect(screen.getByText('memberships list')).toBeInTheDocument();
  });

  it('says nothing to a user who has an account', () => {
    signIn([{ id: 'a1' } as never]);

    render(<ProjectMembershipsSettingsPage />);

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('says nothing when public sign-up is on', () => {
    mockPolicy = { publicSignupEnabled: true, bootstrapOpen: false, loading: false };
    signIn([]);

    render(<ProjectMembershipsSettingsPage />);

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('waits for the sign-up policy, which reads as closed while it loads', () => {
    mockPolicy = { publicSignupEnabled: false, bootstrapOpen: false, loading: true };
    signIn([]);

    render(<ProjectMembershipsSettingsPage />);

    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });
});
