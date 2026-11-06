// @vitest-environment jsdom

import type { User } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { UserGeneralCard } from './user-general-card';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock('@grantjs/client/react', () => ({ useGrant: () => false }));
vi.mock('@/hooks/common', () => ({
  useScopeFromParams: () => ({ tenant: 'account', id: 'scope-1' }),
  useProjectUserScope: () => null,
}));
vi.mock('@/hooks/users', () => ({
  useUserMutations: () => ({ uploadUserPictureDirect: vi.fn(), updateUser: vi.fn() }),
}));
vi.mock('@/components/features/settings', () => ({
  SettingImageUploadDialog: () => null,
}));

const infoTable = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

vi.mock('@/components/common', async () => {
  const actual = await vi.importActual<
    typeof import('@/components/common/entity-detail-info-table')
  >('@/components/common/entity-detail-info-table');
  return {
    Avatar: () => <span />,
    CopyToClipboard: () => <button type="button">copy</button>,
    FeatureModuleCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
    PrimaryTagSelector: () => null,
    EntityDetailInfoTable: (props: ComponentProps<typeof actual.EntityDetailInfoTable>) => {
      infoTable.props.push(props as unknown as Record<string, unknown>);
      return <actual.EntityDetailInfoTable {...props} />;
    },
  };
});

const user = {
  id: 'user-1',
  name: 'Test User',
  tags: [],
  authenticationMethods: [{ provider: 'email', providerId: 'person@example.test' }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
} as unknown as User;

describe('UserGeneralCard', () => {
  it('shows its Field/Value rows through the shared EntityDetailInfoTable, with its own table id', () => {
    const { container } = render(<UserGeneralCard user={user} />);

    expect(infoTable.props.length).toBeGreaterThan(0);
    expect(infoTable.props[0]).toMatchObject({
      tableId: 'user.info',
      fieldColumnHeader: 'tableField',
      valueColumnHeader: 'tableValue',
    });
    // user id, one sign-in method, created, updated
    expect(infoTable.props[0].rows).toHaveLength(4);
    expect(container.querySelector('[data-table-id="user.info"]')).toBeInTheDocument();
    // The shared table: Field and Value are resizable.
    expect(screen.getAllByRole('separator')).toHaveLength(2);
    expect(container.querySelectorAll('table')).toHaveLength(1);
  });
});
