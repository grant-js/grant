import { GroupResolvers } from '@/graphql/generated/types';

export const groupPermissionsResolver: GroupResolvers['permissions'] = async (
  parent,
  { scope },
  context
) => {
  // Get group-permission relationships for this group
  const groupPermissions = await context.providers.groupPermissions.getGroupPermissions({
    groupId: parent.id,
    scope,
  });

  const permissionIds = groupPermissions.map((gp) => gp.permissionId);

  if (permissionIds.length === 0) {
    return [];
  }

  // Get all permissions with limit -1
  const permissionsResult = await context.providers.permissions.getPermissions({
    ids: permissionIds,
    scope,
    limit: -1,
  });

  return permissionsResult.permissions;
};
