import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const exchangeProjectUserApiKeyResolver: MutationResolvers<GraphqlContext>['exchangeProjectUserApiKey'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectUserApiKeys.exchangeProjectUserApiKey({ input });
  };
