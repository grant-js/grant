import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const setApiKeyPermissionsResolver: MutationResolvers<GraphqlContext>['setApiKeyPermissions'] =
  async (_parent, args, context) => {
    return await context.handlers.apiKeys.setApiKeyPermissions(args);
  };
