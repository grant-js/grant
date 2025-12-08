import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteProjectUserApiKeyResolver: MutationResolvers<GraphqlContext>['deleteProjectUserApiKey'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectUserApiKeys.deleteProjectUserApiKey({ input });
  };
