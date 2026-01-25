import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteMyUserAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['deleteMyUserAuthenticationMethod'] =
  async (_parent, { id }, context) => {
    return await context.handlers.me.deleteMyUserAuthenticationMethod(id);
  };
