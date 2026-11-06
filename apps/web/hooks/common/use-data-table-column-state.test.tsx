// @vitest-environment jsdom

import { type Account, AccountType } from '@grantjs/schema';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataTableColumnConfig } from '@/components/common/data-table';
import { useAuthStore } from '@/stores/auth.store';

import { useDataTableColumnState } from './use-data-table-column-state';

type Row = Record<string, never>;

const columns: DataTableColumnConfig<Row>[] = [
  { key: 'icon', header: '', render: () => null },
  { key: 'name', header: 'Name', render: () => null },
  { key: 'tags', header: 'Tags', render: () => null },
];

const none = new Set<string>();

function signIn(userId: string | null) {
  useAuthStore.setState({
    accounts:
      userId === null
        ? []
        : ([
            { id: `acc-${userId}`, type: AccountType.Personal, ownerId: userId },
          ] as unknown as Account[]),
  });
}

function useTable(tableId: string) {
  return useDataTableColumnState(columns, { tableId, defaultHiddenKeys: none });
}

function visibleKeys(result: { current: ReturnType<typeof useTable> }) {
  return result.current.visibleColumns.map((column) => column.key);
}

const keyFor = (userId: string, tableId: string) => `grant:table:v1:${userId}:${tableId}`;

beforeEach(() => {
  window.localStorage.clear();
  signIn('u1');
});

afterEach(() => {
  vi.restoreAllMocks();
  useAuthStore.setState({ accounts: [] });
});

describe('useDataTableColumnState', () => {
  it('returns default visibility, order and widths and writes nothing until a change', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useTable('users.list'));

    expect(visibleKeys(result)).toEqual(['icon', 'name', 'tags']);
    expect(result.current.order).toEqual(['icon', 'name', 'tags']);
    expect(result.current.widths).toEqual({});
    expect(setItem).not.toHaveBeenCalled();
    expect(
      Object.keys(window.localStorage).filter((key) => key.startsWith('grant:table:'))
    ).toEqual([]);
  });

  it('saves a visibility change and restores it on the next mount', () => {
    const first = renderHook(() => useTable('users.list'));
    act(() => first.result.current.toggleColumn('tags', false));

    expect(JSON.parse(window.localStorage.getItem(keyFor('u1', 'users.list'))!)).toEqual({
      visibility: { icon: true, name: true, tags: false },
      order: ['icon', 'name', 'tags'],
      widths: {},
    });
    first.unmount();

    const second = renderHook(() => useTable('users.list'));
    expect(visibleKeys(second.result)).toEqual(['icon', 'name']);
  });

  it('keeps tables and users apart', () => {
    const users = renderHook(() => useTable('users.list'));
    act(() => users.result.current.toggleColumn('tags', false));

    const roles = renderHook(() => useTable('roles.list'));
    expect(visibleKeys(roles.result)).toEqual(['icon', 'name', 'tags']);

    signIn('u2');
    const otherUser = renderHook(() => useTable('users.list'));
    expect(visibleKeys(otherUser.result)).toEqual(['icon', 'name', 'tags']);
    expect(window.localStorage.getItem(keyFor('u2', 'users.list'))).toBeNull();
  });

  it('falls back to defaults on bad stored JSON and ignores unknown stored keys', () => {
    window.localStorage.setItem(keyFor('u1', 'bad'), '{nope');
    const bad = renderHook(() => useTable('bad'));
    expect(visibleKeys(bad.result)).toEqual(['icon', 'name', 'tags']);

    window.localStorage.setItem(
      keyFor('u1', 'stale'),
      JSON.stringify({
        visibility: { name: false, gone: false },
        order: ['gone'],
        widths: { gone: 99 },
      })
    );
    const stale = renderHook(() => useTable('stale'));
    expect(visibleKeys(stale.result)).toEqual(['icon', 'tags']);
    expect(stale.result.current.visibility).not.toHaveProperty('gone');
    expect(stale.result.current.order).toEqual(['icon', 'name', 'tags']);
    expect(stale.result.current.widths).toEqual({});
  });

  it('keeps working in memory when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });

    const { result } = renderHook(() => useTable('users.list'));
    expect(visibleKeys(result)).toEqual(['icon', 'name', 'tags']);

    act(() => result.current.toggleColumn('name', false));
    expect(visibleKeys(result)).toEqual(['icon', 'tags']);
  });

  it('does not write without a user id', () => {
    signIn(null);
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useTable('users.list'));

    act(() => result.current.toggleColumn('tags', false));

    expect(visibleKeys(result)).toEqual(['icon', 'name']);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reset restores the defaults and removes the saved entry', () => {
    const { result } = renderHook(() => useTable('users.list'));
    act(() => result.current.toggleColumn('tags', false));
    expect(window.localStorage.getItem(keyFor('u1', 'users.list'))).not.toBeNull();

    act(() => result.current.resetColumns());

    expect(visibleKeys(result)).toEqual(['icon', 'name', 'tags']);
    expect(result.current.order).toEqual(['icon', 'name', 'tags']);
    expect(result.current.widths).toEqual({});
    expect(window.localStorage.getItem(keyFor('u1', 'users.list'))).toBeNull();
  });

  it('reset writes nothing when nothing was saved', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useTable('users.list'));

    act(() => result.current.resetColumns());

    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('useDataTableColumnState order', () => {
  const orderColumns: DataTableColumnConfig<Row>[] = [
    { key: 'icon', header: '', render: () => null },
    { key: 'name', header: 'Name', render: () => null },
    { key: 'email', header: 'Email', render: () => null },
    { key: 'role', header: 'Role', render: () => null },
    { key: 'actions', header: 'Actions', render: () => null },
  ];

  function useOrdered() {
    return useDataTableColumnState(orderColumns, {
      tableId: 'users.list',
      defaultHiddenKeys: none,
    });
  }

  const keys = (result: { current: ReturnType<typeof useOrdered> }) =>
    result.current.visibleColumns.map((column) => column.key);

  it('renders the visible columns in the stored order, locked ones first and last', () => {
    window.localStorage.setItem(
      keyFor('u1', 'users.list'),
      JSON.stringify({
        visibility: {},
        order: ['actions', 'role', 'icon', 'email', 'name'],
        widths: {},
      })
    );
    const { result } = renderHook(() => useOrdered());

    expect(keys(result)).toEqual(['icon', 'role', 'email', 'name', 'actions']);
    expect(result.current.columnToggleItems.map((item) => item.key)).toEqual([
      'role',
      'email',
      'name',
      'actions',
    ]);
    expect(result.current.columnToggleItems.map((item) => item.movable)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('moves a column, saves the order and restores it on the next mount', () => {
    const first = renderHook(() => useOrdered());
    act(() => first.result.current.moveColumn('role', 0));

    expect(keys(first.result)).toEqual(['icon', 'role', 'name', 'email', 'actions']);
    expect(JSON.parse(window.localStorage.getItem(keyFor('u1', 'users.list'))!).order).toEqual([
      'icon',
      'role',
      'name',
      'email',
      'actions',
    ]);
    first.unmount();

    const second = renderHook(() => useOrdered());
    expect(keys(second.result)).toEqual(['icon', 'role', 'name', 'email', 'actions']);
  });

  it('keeps a hidden column in its place when it is hidden and shown again', () => {
    const { result } = renderHook(() => useOrdered());
    act(() => result.current.moveColumn('email', 0));
    act(() => result.current.toggleColumn('email', false));
    expect(keys(result)).toEqual(['icon', 'name', 'role', 'actions']);
    expect(result.current.order).toEqual(['icon', 'email', 'name', 'role', 'actions']);

    act(() => result.current.toggleColumn('email', true));
    expect(keys(result)).toEqual(['icon', 'email', 'name', 'role', 'actions']);
  });

  it('ignores moves of locked and unknown columns and writes nothing for a no-op', () => {
    const { result } = renderHook(() => useOrdered());
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    act(() => result.current.moveColumn('icon', 2));
    act(() => result.current.moveColumn('actions', 0));
    act(() => result.current.moveColumn('missing', 0));
    act(() => result.current.moveColumn('name', 0));

    expect(keys(result)).toEqual(['icon', 'name', 'email', 'role', 'actions']);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('reset restores the default order', () => {
    const { result } = renderHook(() => useOrdered());
    act(() => result.current.moveColumn('role', 0));
    act(() => result.current.resetColumns());

    expect(keys(result)).toEqual(['icon', 'name', 'email', 'role', 'actions']);
    expect(window.localStorage.getItem(keyFor('u1', 'users.list'))).toBeNull();
  });

  it('orders skeleton columns like the table', () => {
    const { result } = renderHook(() => useOrdered());
    act(() => result.current.moveColumn('role', 0));

    expect(
      result.current
        .filterSkeletonColumns([
          { key: 'icon', type: 'icon' },
          { key: 'name', type: 'text' },
          { key: 'role', type: 'text' },
        ])
        .map((column) => column.key)
    ).toEqual(['icon', 'role', 'name']);
  });
});
