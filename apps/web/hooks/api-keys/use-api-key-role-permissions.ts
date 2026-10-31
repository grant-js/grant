import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  GetApiKeyRolePermissionsDocument,
  type Permission,
  type RolePage,
  type Scope,
} from '@grantjs/schema';

import { getApiKeyParentScope } from '@/lib/api-key-grants';

/**
 * What a role key's role grants: the permissions of the role's groups, read through the role in the
 * parent tenant it belongs to, plus the ids of any direct role permissions. A preview for the
 * dashboard; the server decides what a key may carry.
 */
export function useApiKeyRolePermissions(
  scope: Scope | null | undefined,
  roleId: string | undefined
) {
  const parentScope = useMemo(() => getApiKeyParentScope(scope), [scope]);
  const ids = useMemo(() => (roleId ? [roleId] : []), [roleId]);

  const { data, loading, error } = useQuery<{ roles: Pick<RolePage, 'roles'> }>(
    GetApiKeyRolePermissionsDocument,
    {
      variables: { scope: parentScope!, ids },
      skip: !parentScope || ids.length === 0,
      fetchPolicy: 'cache-and-network',
    }
  );

  return useMemo(() => {
    const role = data?.roles?.roles?.[0];
    const rows = new Map<string, Permission>();
    for (const group of role?.groups ?? []) {
      for (const permission of group.permissions ?? []) rows.set(permission.id, permission);
    }
    const permissionIds = new Set(rows.keys());
    for (const rolePermission of role?.rolePermissions ?? []) {
      permissionIds.add(rolePermission.permissionId);
    }
    return {
      permissionIds: Array.from(permissionIds),
      permissions: Array.from(rows.values()),
      loading,
      error,
    };
  }, [data, loading, error]);
}
