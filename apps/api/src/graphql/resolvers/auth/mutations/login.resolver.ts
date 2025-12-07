import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const login: MutationResolvers<GraphqlContext>['login'] = async (req, args, context) => {
  return context.handlers.accounts.login(args, context.userAgent, context.ipAddress);
};
