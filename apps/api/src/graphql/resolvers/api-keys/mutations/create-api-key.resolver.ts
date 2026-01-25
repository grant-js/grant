import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const createApiKeyResolver: MutationResolvers<GraphqlContext>['createApiKey'] = async (
  _parent,
  args,
  context
) => {
  return await context.handlers.apiKeys.createApiKey(args);
};
