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
