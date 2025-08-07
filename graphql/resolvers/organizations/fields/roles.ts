import { OrganizationResolvers } from '@/graphql/generated/types';

export const organizationRolesResolver: OrganizationResolvers['roles'] = async (
  parent,
  _args,
  context
) => {
  // Get organization-role relationships for this organization
  const organizationRoles = await context.providers.organizationRoles.getOrganizationRoles({
    organizationId: parent.id,
  });

  // Extract role IDs from organization-role relationships
  const roleIds = organizationRoles.map((or) => or.roleId);

  if (roleIds.length === 0) {
    return [];
  }

  // Get roles by IDs (optimized - no need to fetch all roles)
  const rolesResult = await context.providers.roles.getRoles({
    ids: roleIds,
  });

  return rolesResult.roles;
};
