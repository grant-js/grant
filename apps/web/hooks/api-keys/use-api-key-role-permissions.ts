import { useMemo } from 'react';
import type { Scope } from '@grantjs/schema';

import { useGroups } from '@/hooks/groups';
import { usePermissions } from '@/hooks/permissions';
import { useRoles } from '@/hooks/roles';
import { getApiKeyParentScope } from '@/lib/api-key-grants';

/**
 * What a role key's role grants: the permissions of the role's groups plus its direct ones, with
 * the permission rows. The role is read from the parent tenant it belongs to. A preview for the
 * dashboard; the server decides what a key may carry.
 */
export function useApiKeyRolePermissions(
  scope: Scope | null | undefined,
  roleId: string | undefined
) {
  const parentScope = useMemo(() => getApiKeyParentScope(scope), [scope]);
  const roleIds = useMemo(() => (roleId ? [roleId] : []), [roleId]);

  const {
    roles,
    loading: rolesLoading,
    error: rolesError,
  } = useRoles({ scope: parentScope!, ids: roleIds, limit: 1, page: 1 });
  const role = roles[0];

  const groupIds = useMemo(() => role?.groups?.map((group) => group.id) ?? [], [role]);
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
  } = useGroups({ scope: parentScope!, ids: groupIds, limit: -1 });

  const permissionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const rolePermission of role?.rolePermissions ?? []) ids.add(rolePermission.permissionId);
    for (const group of groups) {
      for (const permission of group.permissions ?? []) ids.add(permission.id);
    }
    return Array.from(ids);
  }, [role, groups]);

  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
  } = usePermissions({ scope: scope!, ids: permissionIds, limit: -1 });

  return {
    permissionIds,
    permissions,
    role,
    loading: rolesLoading || groupsLoading || permissionsLoading,
    error: rolesError ?? groupsError ?? permissionsError,
  };
}
