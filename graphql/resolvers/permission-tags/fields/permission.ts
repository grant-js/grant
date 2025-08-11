import { PermissionTagResolvers } from '@/graphql/generated/types';

export const permissionTagPermissionResolver: PermissionTagResolvers['permission'] = async (
  parent,
  { scope },
  context
) => {
  const permissionsResult = await context.providers.permissions.getPermissions({
    ids: [parent.permissionId],
    scope,
  });

  const permission = permissionsResult.permissions[0];

  if (!permission) {
    throw new Error(`Permission with ID ${parent.permissionId} not found`);
  }

  return permission;
};
