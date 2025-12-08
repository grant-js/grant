import { QueryResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const getProjectUserApiKeysResolver: QueryResolvers<GraphqlContext>['projectUserApiKeys'] =
  async (_parent, args, context) => {
    return await context.handlers.projectUserApiKeys.getProjectUserApiKeys(args);
  };
