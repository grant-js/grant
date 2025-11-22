import { MutationRefreshSessionArgs, MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const refreshSession: MutationResolvers<GraphqlContext>['refreshSession'] = async (
  _,
  args: MutationRefreshSessionArgs,
  context: GraphqlContext
) => {
  return context.handlers.accounts.refreshSession(args, context.userAgent, context.ipAddress);
};
