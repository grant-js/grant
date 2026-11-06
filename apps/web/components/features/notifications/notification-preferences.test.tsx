// @vitest-environment jsdom

import { type Account, AccountType, NotificationChannel } from '@grantjs/schema';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DATA_TABLE_SWITCH_COLUMN_WIDTH } from '@/lib/detail-table-column-width';
import { useAuthStore } from '@/stores/auth.store';

import { NotificationPreferences } from './notification-preferences';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const setPreference = vi.fn().mockResolvedValue(undefined);
let loading = false;

vi.mock('@/hooks/notifications', () => ({
  useNotificationPreferences: () => ({
    preferences: [],
    loading,
    error: undefined,
    setPreference,
  }),
}));

vi.mock('@/components/features/settings', () => ({
  SettingCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

function colWidths(container: HTMLElement) {
  return Array.from(container.querySelectorAll('colgroup > col')).map((col) =>
    col instanceof HTMLElement ? col.style.width : ''
  );
}

describe('NotificationPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear();
    loading = false;
    setPreference.mockClear();
    useAuthStore.setState({
      accounts: [{ id: 'a1', type: AccountType.Personal, ownerId: 'u1' }] as unknown as Account[],
    });
  });

  it('renders the type x channel table through DataTable with fixed, non-resizable channel columns', () => {
    const { container } = render(<NotificationPreferences />);
    expect(
      container.querySelector('[data-table-id="notifications.preferences.account"]')
    ).toBeInTheDocument();
    // Only the type column can be resized; the channel columns are exactly the shared width.
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(colWidths(container).slice(1, 3)).toEqual([
      DATA_TABLE_SWITCH_COLUMN_WIDTH,
      DATA_TABLE_SWITCH_COLUMN_WIDTH,
    ]);
    const channelCells = container.querySelectorAll(
      `td[data-column-key="${NotificationChannel.Email}"]`
    );
    expect(channelCells.length).toBeGreaterThan(0);
    channelCells.forEach((cell) => expect(cell).toHaveClass('text-center'));
  });

  it('keeps the switches toggleable with their accessible names', async () => {
    render(<NotificationPreferences />);
    const toggle = screen.getByRole('switch', {
      name: `iam ${NotificationChannel.Email}`,
    });
    expect(toggle).not.toBeDisabled();
    fireEvent.click(toggle);
    await waitFor(() =>
      expect(setPreference).toHaveBeenCalledWith({
        scopeTenant: 'account',
        category: 'iam',
        channel: NotificationChannel.Email,
        enabled: true,
      })
    );
    // The security row stays locked.
    expect(
      screen.getByRole('switch', { name: `security ${NotificationChannel.InApp}` })
    ).toBeDisabled();
  });

  it('shows the table skeleton while loading', () => {
    loading = true;
    const { container } = render(<NotificationPreferences />);
    expect(screen.queryAllByRole('switch')).toHaveLength(0);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(4);
  });
});
