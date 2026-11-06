// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DataTableColumnConfig } from '@/components/common/data-table';

import {
  buildDefaultColumnState,
  clearStoredColumnState,
  DATA_TABLE_COLUMN_MAX_WIDTH_PX,
  DATA_TABLE_COLUMN_MIN_WIDTH_PX,
  dataTableColumnStorageKey,
  mergeColumnState,
  parseStoredColumnState,
  readStoredColumnState,
  writeStoredColumnState,
} from './data-table-column-state';

type Row = Record<string, never>;

const columns: DataTableColumnConfig<Row>[] = [
  { key: 'icon', header: '', render: () => null },
  { key: 'name', header: 'Name', render: () => null },
  { key: 'tags', header: 'Tags', render: () => null },
];

const none = new Set<string>();

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('dataTableColumnStorageKey', () => {
  it('scopes the key by user and table', () => {
    expect(dataTableColumnStorageKey('u1', 'users.list')).toBe('grant:table:v1:u1:users.list');
    expect(dataTableColumnStorageKey('u2', 'users.list')).not.toBe(
      dataTableColumnStorageKey('u1', 'users.list')
    );
    expect(dataTableColumnStorageKey('u1', 'roles.list')).not.toBe(
      dataTableColumnStorageKey('u1', 'users.list')
    );
  });

  it('has no key without a user id', () => {
    expect(dataTableColumnStorageKey(null, 'users.list')).toBeNull();
    expect(dataTableColumnStorageKey('', 'users.list')).toBeNull();
  });
});

describe('mergeColumnState', () => {
  it('returns the defaults when nothing is stored', () => {
    expect(mergeColumnState(null, columns, none)).toEqual({
      visibility: { icon: true, name: true, tags: true },
      order: ['icon', 'name', 'tags'],
      widths: {},
    });
  });

  it('drops unknown keys from visibility, order and widths', () => {
    const merged = mergeColumnState(
      {
        visibility: { name: false, gone: false },
        order: ['gone', 'tags', 'name', 'icon'],
        widths: { name: 200, gone: 300 },
      },
      columns,
      none
    );

    expect(merged.visibility).toEqual({ icon: true, name: false, tags: true });
    expect(merged.order).toEqual(['tags', 'name', 'icon']);
    expect(merged.widths).toEqual({ name: 200 });
  });

  it('gives a new column its default and appends it to the order', () => {
    const merged = mergeColumnState(
      { visibility: { icon: true, name: false }, order: ['name', 'icon'], widths: {} },
      columns,
      new Set(['tags'])
    );

    expect(merged.visibility).toEqual({ icon: true, name: false, tags: false });
    expect(merged.order).toEqual(['name', 'icon', 'tags']);
  });

  it('never hides a column the picker cannot restore', () => {
    const merged = mergeColumnState(
      { visibility: { icon: false, name: false }, order: [], widths: {} },
      [...columns, { key: 'id', header: 'ID', enableHiding: false, render: () => null }],
      none
    );

    expect(merged.visibility).toMatchObject({ icon: true, id: true, name: false });
  });

  it('keeps the first occurrence of a repeated order key', () => {
    const merged = mergeColumnState(
      { visibility: {}, order: ['name', 'name', 'icon'], widths: {} },
      columns,
      none
    );
    expect(merged.order).toEqual(['name', 'icon', 'tags']);
  });

  it('clamps widths to the allowed range', () => {
    const merged = mergeColumnState(
      { visibility: {}, order: [], widths: { name: 5, tags: 5000, icon: 120 } },
      columns,
      none
    );

    expect(merged.widths).toEqual({
      name: DATA_TABLE_COLUMN_MIN_WIDTH_PX,
      tags: DATA_TABLE_COLUMN_MAX_WIDTH_PX,
      icon: 120,
    });
  });
});

describe('parseStoredColumnState', () => {
  const valid = { visibility: { name: false }, order: ['name'], widths: { name: 100 } };

  it('accepts the stored shape', () => {
    expect(parseStoredColumnState(JSON.stringify(valid))).toEqual(valid);
  });

  it.each([
    ['unparsable JSON', '{nope'],
    ['an array', '[]'],
    ['null', 'null'],
    ['a missing field', JSON.stringify({ visibility: {}, order: [] })],
    ['non-boolean visibility', JSON.stringify({ ...valid, visibility: { name: 'no' } })],
    ['a non-string order key', JSON.stringify({ ...valid, order: [1] })],
    ['a non-numeric width', JSON.stringify({ ...valid, widths: { name: '100' } })],
    ['a negative width', JSON.stringify({ ...valid, widths: { name: -1 } })],
  ])('yields defaults (null) for %s', (_label, raw) => {
    expect(parseStoredColumnState(raw)).toBeNull();
  });

  it('yields null for no entry', () => {
    expect(parseStoredColumnState(null)).toBeNull();
  });
});

describe('storage access', () => {
  const key = 'grant:table:v1:u1:users.list';
  const state = buildDefaultColumnState(columns, none);

  it('round-trips through localStorage and clears', () => {
    writeStoredColumnState(key, state);
    expect(readStoredColumnState(key)).toEqual(state);

    clearStoredColumnState(key);
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it('does nothing without a key', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    writeStoredColumnState(null, state);
    expect(setItem).not.toHaveBeenCalled();
    expect(readStoredColumnState(null)).toBeNull();
  });

  it('falls back silently when storage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readStoredColumnState(key)).toBeNull();
    expect(() => writeStoredColumnState(key, state)).not.toThrow();
    expect(() => clearStoredColumnState(key)).not.toThrow();
  });
});
