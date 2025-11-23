import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createComplementaryAccountResolver: MutationResolvers<GraphqlContext>['createComplementaryAccount'] =
  async (_parent, { input }, context) => {
    const result = await context.handlers.accounts.createComplementaryAccount({
      name: input.name,
      username: input.username || null,
    });
    return result;
  };
