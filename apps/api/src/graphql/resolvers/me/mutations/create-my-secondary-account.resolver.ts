import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createMySecondaryAccountResolver: MutationResolvers<GraphqlContext>['createMySecondaryAccount'] =
  async (_parent, _args, context) => {
    const result = await context.handlers.me.createMySecondaryAccount();
    return result;
  };
