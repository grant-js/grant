import { UserResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const userGroupsResolver: UserResolvers<GraphqlContext>['userGroups'] = async (
  parent,
  _args,
  context
) => {
  const userId = parent.id;

  if (parent.userGroups) {
    return parent.userGroups;
  }

  return await context.handlers.users.getUserGroups({ userId });
};
