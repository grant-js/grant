import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteMyAccountsResolver: MutationResolvers<GraphqlContext>['deleteMyAccounts'] =
  async (_parent, { input }, context) => {
    return await context.handlers.me.deleteMyAccounts(input);
  };
