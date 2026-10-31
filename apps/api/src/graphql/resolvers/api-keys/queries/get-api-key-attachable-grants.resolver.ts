import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const getApiKeyAttachableGrantsResolver: QueryResolvers<GraphqlContext>['apiKeyAttachableGrants'] =
  async (_parent, args, context) => {
    return await context.handlers.apiKeys.getAttachableGrants(args);
  };
