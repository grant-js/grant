import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth.store';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => `${namespace}.${key}`,
}));

vi.mock('@/hooks/accounts', async () => ({
  useIsAccountless: (await import('@/hooks/accounts/use-is-accountless')).useIsAccountless,
}));
vi.mock('@/hooks/auth', () => ({ useEmailVerified: () => true }));
vi.mock('@/hooks/privacy', () => ({
  usePrivacySettings: () => ({
    isExporting: false,
    isDeleting: false,
    handleExportData: vi.fn(),
    handleDeleteAccounts: vi.fn(),
  }),
}));
vi.mock('@/lib/auth', () => ({ getCurrentUserId: () => 'user-1' }));
vi.mock('@/lib/runtime-config', () => ({
  getRuntimeConfig: () => ({ accountDeletionRetentionDays: 30 }),
}));
vi.mock('@/components/common', () => ({ CopyToClipboard: () => null }));
vi.mock('@/components/features/settings', () => ({
  SettingCard: ({
    title,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

const { SettingPrivacy } = await import('./setting-privacy');

function signIn(accounts: never[]) {
  act(() => {
    useAuthStore.setState({ accessToken: 'token', accounts, accountsLoaded: true });
  });
}

beforeEach(() => {
  act(() => {
    useAuthStore.getState().clearAuth();
  });
});

describe('privacy settings, deletion card', () => {
  it('talks about accounts for a user who has one', () => {
    signIn([{ id: 'a1' } as never]);

    render(<SettingPrivacy />);

    expect(screen.getByText('settings.privacy.accountDeletion.title')).toBeInTheDocument();
    expect(screen.getByText('settings.privacy.accountDeletion.deleteButton')).toBeInTheDocument();
    expect(screen.queryByText(/identityDeletion/)).not.toBeInTheDocument();
  });

  it('says it deletes the identity for an account-less user', () => {
    signIn([]);

    render(<SettingPrivacy />);

    expect(screen.getByText('settings.privacy.identityDeletion.title')).toBeInTheDocument();
    expect(screen.getByText('settings.privacy.identityDeletion.deleteButton')).toBeInTheDocument();
    expect(screen.queryByText(/accountDeletion/)).not.toBeInTheDocument();
  });

  it('offers the data export either way', () => {
    signIn([]);

    render(<SettingPrivacy />);

    expect(screen.getByText('settings.privacy.dataExport.title')).toBeInTheDocument();
    expect(screen.getByText('settings.privacy.dataExport.export')).toBeInTheDocument();
  });
});
