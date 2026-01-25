import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const setMyPrimaryAuthenticationMethodResolver: MutationResolvers<GraphqlContext>['setMyPrimaryAuthenticationMethod'] =
  async (_parent, { id }, context) => {
    return await context.handlers.me.setMyPrimaryAuthenticationMethod(id);
  };
