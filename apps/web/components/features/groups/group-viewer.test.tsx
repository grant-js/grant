// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GroupViewer } from './group-viewer';

/**
 * Regression test for code-quality/web.md finding 0.2: `lib/apollo-client.ts` deliberately
 * exempts RBAC list queries (including `GetGroupsList`) from the global 403 -> /forbidden
 * redirect, on the stated assumption that the viewer shows an inline error instead. GroupViewer
 * (and the five other RBAC list viewers with the identical shape) never destructured `error`
 * from its query hook, so a permission-denied response rendered as a silent empty list.
 */

vi.mock('@/hooks/common', () => ({
  useScopeFromParams: () => ({ tenant: 'account', id: 'account-1' }),
}));

vi.mock('@grantjs/client/react', () => ({
  useGrant: () => true,
}));

const useGroupsListMock = vi.fn();
vi.mock('@/hooks/groups/use-groups-list', () => ({
  useGroupsList: (...args: unknown[]) => useGroupsListMock(...args),
}));

vi.mock('@/stores/groups.store', () => ({
  useGroupsStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      view: 'table',
      page: 1,
      limit: 25,
      search: '',
      sort: null,
      selectedTagIds: [],
      setTotalCount: vi.fn(),
      setGroups: vi.fn(),
      setLoading: vi.fn(),
      setRefetch: vi.fn(),
    }),
}));

vi.mock('./group-cards', () => ({ GroupCards: () => null }));
vi.mock('./group-table', () => ({
  GroupTable: () => <div data-testid="group-table">rendered table</div>,
}));

describe('GroupViewer', () => {
  it('renders the table when the query succeeds', () => {
    useGroupsListMock.mockReturnValue({
      groups: [],
      loading: false,
      error: undefined,
      totalCount: 0,
      refetch: vi.fn(),
    });

    render(<GroupViewer />);

    expect(screen.getByTestId('group-table')).toBeInTheDocument();
  });

  it('renders an inline error instead of a silent empty list when the query errors', () => {
    useGroupsListMock.mockReturnValue({
      groups: [],
      loading: false,
      error: new Error('You do not have permission to view groups in this scope.'),
      totalCount: 0,
      refetch: vi.fn(),
    });

    render(<GroupViewer />);

    expect(
      screen.getByText('You do not have permission to view groups in this scope.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('group-table')).not.toBeInTheDocument();
  });
});
