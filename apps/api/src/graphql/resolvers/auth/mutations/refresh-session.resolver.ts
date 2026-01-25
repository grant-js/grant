import { MutationRefreshSessionArgs, MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const refreshSession: MutationResolvers<GraphqlContext>['refreshSession'] = async (
  _,
  args: MutationRefreshSessionArgs,
  context: GraphqlContext
) => {
  return context.handlers.auth.refreshSession(args, context.userAgent, context.ipAddress);
};
