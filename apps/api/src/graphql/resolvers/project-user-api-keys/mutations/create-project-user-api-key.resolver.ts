import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const createProjectUserApiKeyResolver: MutationResolvers<GraphqlContext>['createProjectUserApiKey'] =
  async (_parent, { input }, context) => {
    return await context.handlers.projectUserApiKeys.createProjectUserApiKey({ input });
  };
