import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const userPermissionsResolver: UserResolvers<GraphqlContext>['userPermissions'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.userPermissions) {
    return parent.userPermissions;
  }

  return await context.handlers.users.getUserPermissions({ userId });
};
