import { OrganizationResolvers } from '@/graphql/generated/types';

export const organizationPermissionsResolver: OrganizationResolvers['permissions'] = async (
  parent,
  _args,
  context
) => {
  // Get organization-permission relationships for this organization
  const organizationPermissions =
    await context.providers.organizationPermissions.getOrganizationPermissions({
      organizationId: parent.id,
    });

  // Extract permission IDs from organization-permission relationships
  const permissionIds = organizationPermissions.map((op) => op.permissionId);

  if (permissionIds.length === 0) {
    return [];
  }

  // Get permissions by IDs (optimized - no need to fetch all permissions)
  const permissionsResult = await context.providers.permissions.getPermissions({
    ids: permissionIds,
  });

  return permissionsResult.permissions;
};
