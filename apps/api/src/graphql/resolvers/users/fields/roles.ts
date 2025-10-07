import { UserResolvers } from '@logusgraphics/grant-schema';

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

  return await context.controllers.users.getUserRoles({
    userId,
    requestedFields: ['roles'],
  });
};
