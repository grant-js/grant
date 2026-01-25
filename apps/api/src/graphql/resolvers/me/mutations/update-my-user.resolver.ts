import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const updateMyUserResolver: MutationResolvers<GraphqlContext>['updateMyUser'] = async (
  _parent,
  { input },
  context
) => {
  return await context.handlers.me.updateMyUser(input);
};
