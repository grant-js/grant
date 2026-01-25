import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const userRolesResolver: UserResolvers<GraphqlContext>['roles'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.roles) {
    return parent.roles;
  }

  return await context.handlers.users.getUserRoles({
    userId,
    requestedFields: ['roles'],
  });
};
