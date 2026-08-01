import { describe, expect, it } from 'vitest';

import {
  buildInheritedFromRoleByGroupId,
  buildRolePermissionInheritanceMap,
  buildUserPermissionInheritanceMaps,
  computeRolePermissionRowState,
  computeUserGroupRowState,
  computeUserPermissionRowState,
} from './rbac-relationship-state';

describe('computeUserGroupRowState', () => {
  const inherited = new Map([['g1', 'Role A']]);
  const direct = new Set(['g2']);

  it('returns unchecked enabled when not attached', () => {
    expect(
      computeUserGroupRowState('g9', {
        directGroupIds: direct,
        inheritedFromRoleByGroupId: inherited,
      })
    ).toEqual({
      checked: false,
      disabled: false,
      source: undefined,
    });
  });

  it('returns checked disabled when inherited only', () => {
    expect(
      computeUserGroupRowState('g1', {
        directGroupIds: direct,
        inheritedFromRoleByGroupId: inherited,
      })
    ).toEqual({
      checked: true,
      disabled: true,
      source: { kind: 'inherited', label: 'Role A' },
    });
  });

  it('returns checked enabled when directly attached', () => {
    expect(
      computeUserGroupRowState('g2', {
        directGroupIds: direct,
        inheritedFromRoleByGroupId: inherited,
      })
    ).toEqual({
      checked: true,
      disabled: false,
      source: { kind: 'direct', label: 'direct' },
    });
  });

  it('returns checked enabled when both direct and inherited', () => {
    const bothDirect = new Set(['g1']);
    expect(
      computeUserGroupRowState('g1', {
        directGroupIds: bothDirect,
        inheritedFromRoleByGroupId: inherited,
      })
    ).toEqual({
      checked: true,
      disabled: false,
      source: { kind: 'direct', label: 'Role A' },
    });
  });
});

describe('computeUserPermissionRowState', () => {
  const fromGroup = new Map([['p1', 'Group G']]);
  const fromRole = new Map([['p2', 'Role R']]);
  const direct = new Set(['p3']);

  it('marks inherited-from-group as checked disabled', () => {
    expect(
      computeUserPermissionRowState('p1', {
        directPermissionIds: direct,
        inheritedFromGroupByPermissionId: fromGroup,
        inheritedFromRoleByPermissionId: fromRole,
      })
    ).toEqual({
      checked: true,
      disabled: true,
      source: { kind: 'inherited', label: 'Group G' },
    });
  });

  it('marks direct permission as checked enabled', () => {
    expect(
      computeUserPermissionRowState('p3', {
        directPermissionIds: direct,
        inheritedFromGroupByPermissionId: fromGroup,
        inheritedFromRoleByPermissionId: fromRole,
      })
    ).toEqual({
      checked: true,
      disabled: false,
      source: { kind: 'direct', label: 'direct' },
    });
  });
});

describe('computeRolePermissionRowState', () => {
  const fromGroup = new Map([['p1', 'Group G']]);
  const direct = new Set(['p2']);

  it('disables inherited group permissions', () => {
    expect(
      computeRolePermissionRowState('p1', {
        directPermissionIds: direct,
        inheritedFromGroupByPermissionId: fromGroup,
      })
    ).toEqual({
      checked: true,
      disabled: true,
      source: { kind: 'inherited', label: 'Group G' },
    });
  });
});

describe('buildInheritedFromRoleByGroupId', () => {
  it('dedupes groups and keeps first role name', () => {
    const map = buildInheritedFromRoleByGroupId([
      { name: 'R1', groups: [{ id: 'g1' }, { id: 'g2' }] },
      { name: 'R2', groups: [{ id: 'g1' }] },
    ]);
    expect(map.get('g1')).toBe('R1');
    expect(map.get('g2')).toBe('R1');
  });
});

describe('buildUserPermissionInheritanceMaps', () => {
  it('collects group and role direct inheritance', () => {
    const { inheritedFromGroupByPermissionId, inheritedFromRoleByPermissionId } =
      buildUserPermissionInheritanceMaps(
        [
          {
            name: 'R1',
            rolePermissions: [{ permission: { id: 'p-role' } }],
          },
        ],
        [{ name: 'G1', permissions: [{ id: 'p-group' }] }]
      );
    expect(inheritedFromGroupByPermissionId.get('p-group')).toBe('G1');
    expect(inheritedFromRoleByPermissionId.get('p-role')).toBe('R1');
  });

  it('prefers rolePermissions.permissionId when nested permission is absent', () => {
    const { inheritedFromRoleByPermissionId } = buildUserPermissionInheritanceMaps(
      [{ name: 'R1', rolePermissions: [{ permissionId: 'p-direct' }] }],
      []
    );
    expect(inheritedFromRoleByPermissionId.get('p-direct')).toBe('R1');
  });
});

describe('buildRolePermissionInheritanceMap', () => {
  it('maps permissions to group names', () => {
    const map = buildRolePermissionInheritanceMap([{ name: 'G1', permissions: [{ id: 'p1' }] }]);
    expect(map.get('p1')).toBe('G1');
  });
});
