import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createComplementaryAccountResolver: MutationResolvers<GraphqlContext>['createComplementaryAccount'] =
  async (_parent, _args, context) => {
    const result = await context.handlers.accounts.createComplementaryAccount();
    return result;
  };
