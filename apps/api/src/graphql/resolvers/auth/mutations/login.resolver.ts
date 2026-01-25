import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const login: MutationResolvers<GraphqlContext>['login'] = async (req, args, context) => {
  return context.handlers.auth.login(args, context.userAgent, context.ipAddress);
};
