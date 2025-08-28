import { UserResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedRoleIds } from '@/graphql/lib/scopeFiltering';

export const userRolesResolver: UserResolvers['roles'] = async (
  parent,
  { scope },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const userRoles = await context.services.userRoles.getUserRoles({
    userId: parent.id,
  });

  if (userRoles.length === 0) {
    return [];
  }

  const scopedRoleIds = await getScopedRoleIds({ scope, context });

  const filteredUserRoles = userRoles.filter((ur) => scopedRoleIds.includes(ur.roleId));

  if (filteredUserRoles.length === 0) {
    return [];
  }

  const filteredRoleIds = filteredUserRoles.map((ur) => ur.roleId);

  const rolesResult = await context.services.roles.getRoles({
    ids: filteredRoleIds,
    limit: -1,
    requestedFields,
  });

  return rolesResult.roles;
};
