import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeProjectUserApiKeyResolver: MutationResolvers<GraphqlContext>['revokeProjectUserApiKey'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectUserApiKeys.revokeProjectUserApiKey({ input });
  };
