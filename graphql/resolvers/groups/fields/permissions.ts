import { GroupResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedPermissionIds } from '@/graphql/lib/scopeFiltering';

export const groupPermissionsResolver: GroupResolvers['permissions'] = async (
  parent,
  { scope },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const groupPermissions = await context.services.groupPermissions.getGroupPermissions({
    groupId: parent.id,
  });

  const permissionIds = groupPermissions.map((gp) => gp.permissionId);

  if (permissionIds.length === 0) {
    return [];
  }

  const scopedPermissionIds = await getScopedPermissionIds({ scope, context });
  const accessiblePermissionIds = permissionIds.filter((id) => scopedPermissionIds.includes(id));

  if (accessiblePermissionIds.length === 0) {
    return [];
  }

  const permissionsResult = await context.services.permissions.getPermissions({
    ids: accessiblePermissionIds,
    limit: -1,
    requestedFields,
  });

  return permissionsResult.permissions;
};
