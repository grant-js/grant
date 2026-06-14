export type DetailAttachmentFilter = 'all' | 'selected';

export function resolveDetailQueryIds(
  filter: DetailAttachmentFilter,
  selectedIds: readonly string[]
): string[] | undefined {
  if (filter === 'all') {
    return undefined;
  }
  return [...selectedIds];
}

export function collectAttachedGroupIds(
  directGroupIds: ReadonlySet<string>,
  inheritedFromRoleByGroupId: ReadonlyMap<string, string>
): string[] {
  const ids = new Set(directGroupIds);
  for (const groupId of inheritedFromRoleByGroupId.keys()) {
    ids.add(groupId);
  }
  return Array.from(ids);
}

export function collectAttachedPermissionIds(
  directPermissionIds: ReadonlySet<string>,
  inheritedFromGroupByPermissionId: ReadonlyMap<string, string>,
  inheritedFromRoleByPermissionId: ReadonlyMap<string, string>
): string[] {
  const ids = new Set(directPermissionIds);
  for (const permissionId of inheritedFromGroupByPermissionId.keys()) {
    ids.add(permissionId);
  }
  for (const permissionId of inheritedFromRoleByPermissionId.keys()) {
    ids.add(permissionId);
  }
  return Array.from(ids);
}

export function collectRoleAttachedPermissionIds(
  directPermissionIds: ReadonlySet<string>,
  inheritedFromGroupByPermissionId: ReadonlyMap<string, string>
): string[] {
  const ids = new Set(directPermissionIds);
  for (const permissionId of inheritedFromGroupByPermissionId.keys()) {
    ids.add(permissionId);
  }
  return Array.from(ids);
}
