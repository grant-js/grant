import { UserResolvers } from '@/graphql/generated/types';

export const userRolesResolver: UserResolvers['roles'] = async (parent, { scope }, context) => {
  // Get user-role relationships for this user
  const userRoles = await context.providers.userRoles.getUserRoles({
    userId: parent.id,
    scope,
  });

  // Extract role IDs from user-role relationships
  const roleIds = userRoles.map((ur) => ur.roleId);

  if (roleIds.length === 0) {
    return [];
  }

  // Get all roles with limit -1
  const rolesResult = await context.providers.roles.getRoles({
    ids: roleIds,
    scope,
    limit: -1,
  });

  return rolesResult.roles;
};
