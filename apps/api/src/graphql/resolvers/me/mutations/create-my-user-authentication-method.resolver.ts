import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createMyUserAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['createMyUserAuthenticationMethod'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.createMyUserAuthenticationMethod(input, context.locale);
  };
