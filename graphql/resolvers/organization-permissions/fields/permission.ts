import { OrganizationPermissionResolvers } from '@/graphql/generated/types';

export const organizationPermissionPermissionResolver: OrganizationPermissionResolvers['permission'] =
  async (parent, _args, context) => {
    // Get the permission by permissionId (optimized - no need to fetch all permissions)
    const permissionsResult = await context.providers.permissions.getPermissions({
      ids: [parent.permissionId],
    });

    const permission = permissionsResult.permissions[0];

    if (!permission) {
      throw new Error(`Permission with ID ${parent.permissionId} not found`);
    }

    return permission;
  };
