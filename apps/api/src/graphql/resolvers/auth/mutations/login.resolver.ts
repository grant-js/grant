import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const login: MutationResolvers<GraphqlContext>['login'] = async (req, args, context) => {
  const audience = context.origin;
  return context.handlers.accounts.login(args, audience, context.userAgent, context.ipAddress);
};
