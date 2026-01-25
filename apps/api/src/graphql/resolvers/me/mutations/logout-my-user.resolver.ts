import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const logoutMyUserResolver: MutationResolvers<GraphqlContext>['logoutMyUser'] = async (
  _parent,
  _args,
  context
) => {
  await context.handlers.me.logout();

  return {
    message: 'Logged out successfully',
  };
};
