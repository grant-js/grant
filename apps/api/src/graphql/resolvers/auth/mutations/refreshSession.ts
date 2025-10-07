import { MutationRefreshSessionArgs, MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const refreshSession: MutationResolvers<GraphqlContext>['refreshSession'] = async (
  _: any,
  args: MutationRefreshSessionArgs,
  context: GraphqlContext
) => {
  return context.controllers.accounts.refreshSession(args);
};
