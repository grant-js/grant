import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { unboundedList } from '@/lib/pagination.lib';

export const userRolesResolver: UserResolvers<GraphqlContext>['roles'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;
  const scope = context.user?.scope ?? null;

  if (scope) {
    const roleIds = await context.handlers.users.getUserRoleIdsInScope(userId, scope);
    if (roleIds.length === 0) return [];
    const rolesPage = await context.handlers.roles.getRoles(
      unboundedList({
        scope,
        ids: roleIds,
        limit: -1,
      })
    );
    return rolesPage.roles ?? [];
  }

  if (parent.roles) {
    return parent.roles;
  }

  return await context.handlers.users.getUserRoles({
    userId,
    requestedFields: ['roles'],
  });
};
