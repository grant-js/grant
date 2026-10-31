import { describe, expect, it } from 'vitest';

import {
  type ApiKeyScopeRow,
  getScopeGroupState,
  groupScopeRows,
  toggleScopeGroup,
  toggleScopeRow,
} from '@/lib/api-key-scope-groups';

function row(
  id: string,
  resourceSlug: string | null,
  action: string,
  machineOnly = false
): ApiKeyScopeRow {
  return {
    permission: {
      id,
      name: `${resourceSlug}.${action}`,
      action,
      description: null,
      resource: resourceSlug ? { slug: resourceSlug, name: resourceSlug } : null,
    },
    machineOnly,
  };
}

const rows = [
  row('u-query', 'user', 'query'),
  row('p-read', 'project', 'read'),
  row('u-read', 'user', 'read'),
  row('u-create', 'user', 'create'),
  row('x-any', null, 'any'),
];

describe('groupScopeRows', () => {
  it('groups by resource slug, orders groups by slug and rows by action', () => {
    const groups = groupScopeRows(rows);

    expect(groups.map((group) => group.key)).toEqual(['other', 'project', 'user']);
    expect(groups[2].rows.map((entry) => entry.permission.id)).toEqual([
      'u-create',
      'u-query',
      'u-read',
    ]);
  });
});

describe('getScopeGroupState', () => {
  const userRows = rows.filter((entry) => entry.permission.resource?.slug === 'user');
  const none = new Set<string>();

  it('is unchecked, indeterminate and checked by how many selectable rows are selected', () => {
    expect(getScopeGroupState(userRows, none, none)).toBe('unchecked');
    expect(getScopeGroupState(userRows, new Set(['u-read']), none)).toBe('indeterminate');
    expect(getScopeGroupState(userRows, new Set(['u-read', 'u-query', 'u-create']), none)).toBe(
      'checked'
    );
  });

  it('ignores disabled rows, and is disabled when none is selectable', () => {
    const disabled = new Set(['u-create']);

    expect(getScopeGroupState(userRows, new Set(['u-read', 'u-query']), disabled)).toBe('checked');
    expect(getScopeGroupState(userRows, none, new Set(['u-create', 'u-query', 'u-read']))).toBe(
      'disabled'
    );
  });
});

describe('toggleScopeGroup', () => {
  const userRows = rows.filter((entry) => entry.permission.resource?.slug === 'user');

  it('selects every selectable row of the group and keeps the rest of the selection', () => {
    const next = toggleScopeGroup(['p-read'], userRows, new Set(['u-create']), true);

    expect(next.sort()).toEqual(['p-read', 'u-query', 'u-read']);
  });

  it('clears the selectable rows of the group only', () => {
    const next = toggleScopeGroup(
      ['p-read', 'u-read', 'u-create'],
      userRows,
      new Set(['u-create']),
      false
    );

    expect(next.sort()).toEqual(['p-read', 'u-create']);
  });
});

describe('toggleScopeRow', () => {
  it('adds once and removes', () => {
    expect(toggleScopeRow(['a'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleScopeRow(['a', 'b'], 'b', true)).toEqual(['a', 'b']);
    expect(toggleScopeRow(['a', 'b'], 'a', false)).toEqual(['b']);
  });
});
