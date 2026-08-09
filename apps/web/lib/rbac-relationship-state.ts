type RelationshipSourceKind = 'direct' | 'inherited';

type RelationshipSource = {
  kind: RelationshipSourceKind;
  label: string;
};

export type RelationshipRowState = {
  checked: boolean;
  disabled: boolean;
  source?: RelationshipSource;
};

export function computeUserGroupRowState(
  groupId: string,
  params: {
    directGroupIds: ReadonlySet<string>;
    inheritedFromRoleByGroupId: ReadonlyMap<string, string>;
  }
): RelationshipRowState {
  const isDirect = params.directGroupIds.has(groupId);
  const inheritedFromRole = params.inheritedFromRoleByGroupId.get(groupId);
  const isInherited = inheritedFromRole !== undefined;

  return {
    checked: isDirect || isInherited,
    disabled: isInherited && !isDirect,
    source: isDirect
      ? isInherited
        ? { kind: 'direct', label: inheritedFromRole! }
        : { kind: 'direct', label: 'direct' }
      : isInherited
        ? { kind: 'inherited', label: inheritedFromRole! }
        : undefined,
  };
}

export function computeUserPermissionRowState(
  permissionId: string,
  params: {
    directPermissionIds: ReadonlySet<string>;
    inheritedFromGroupByPermissionId: ReadonlyMap<string, string>;
    inheritedFromRoleByPermissionId: ReadonlyMap<string, string>;
  }
): RelationshipRowState {
  const isDirect = params.directPermissionIds.has(permissionId);
  const inheritedFromGroup = params.inheritedFromGroupByPermissionId.get(permissionId);
  const inheritedFromRole = params.inheritedFromRoleByPermissionId.get(permissionId);
  const isInherited = inheritedFromGroup !== undefined || inheritedFromRole !== undefined;

  const inheritedLabel =
    inheritedFromGroup !== undefined
      ? inheritedFromGroup
      : inheritedFromRole !== undefined
        ? inheritedFromRole
        : undefined;

  return {
    checked: isDirect || isInherited,
    disabled: isInherited && !isDirect,
    source: isDirect
      ? isInherited && inheritedLabel
        ? { kind: 'direct', label: inheritedLabel }
        : { kind: 'direct', label: 'direct' }
      : inheritedLabel
        ? { kind: 'inherited', label: inheritedLabel }
        : undefined,
  };
}

export function computeRolePermissionRowState(
  permissionId: string,
  params: {
    directPermissionIds: ReadonlySet<string>;
    inheritedFromGroupByPermissionId: ReadonlyMap<string, string>;
  }
): RelationshipRowState {
  const isDirect = params.directPermissionIds.has(permissionId);
  const inheritedFromGroup = params.inheritedFromGroupByPermissionId.get(permissionId);
  const isInherited = inheritedFromGroup !== undefined;

  return {
    checked: isDirect || isInherited,
    disabled: isInherited && !isDirect,
    source: isDirect
      ? isInherited
        ? { kind: 'direct', label: inheritedFromGroup! }
        : { kind: 'direct', label: 'direct' }
      : isInherited
        ? { kind: 'inherited', label: inheritedFromGroup! }
        : undefined,
  };
}

export function buildInheritedFromRoleByGroupId(
  roles: Array<{ name: string; groups?: Array<{ id: string }> | null }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const role of roles) {
    for (const group of role.groups ?? []) {
      if (!map.has(group.id)) {
        map.set(group.id, role.name);
      }
    }
  }
  return map;
}

export function buildUserPermissionInheritanceMaps(
  roles: Array<{
    name: string;
    groups?: Array<{ permissions?: Array<{ id: string }> | null }> | null;
    rolePermissions?: Array<{
      permissionId?: string | null;
      permission?: { id: string } | null;
    }> | null;
  }>,
  groups: Array<{ name: string; permissions?: Array<{ id: string }> | null }>
): {
  inheritedFromGroupByPermissionId: Map<string, string>;
  inheritedFromRoleByPermissionId: Map<string, string>;
} {
  const inheritedFromGroupByPermissionId = new Map<string, string>();
  const inheritedFromRoleByPermissionId = new Map<string, string>();

  for (const group of groups) {
    for (const permission of group.permissions ?? []) {
      if (!inheritedFromGroupByPermissionId.has(permission.id)) {
        inheritedFromGroupByPermissionId.set(permission.id, group.name);
      }
    }
  }

  for (const role of roles) {
    for (const rolePermission of role.rolePermissions ?? []) {
      const permissionId = rolePermission.permissionId ?? rolePermission.permission?.id;
      if (permissionId && !inheritedFromRoleByPermissionId.has(permissionId)) {
        inheritedFromRoleByPermissionId.set(permissionId, role.name);
      }
    }
  }

  return { inheritedFromGroupByPermissionId, inheritedFromRoleByPermissionId };
}

export function buildRolePermissionInheritanceMap(
  groups: Array<{ name: string; permissions?: Array<{ id: string }> | null }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const group of groups) {
    for (const permission of group.permissions ?? []) {
      if (!map.has(permission.id)) {
        map.set(permission.id, group.name);
      }
    }
  }
  return map;
}
