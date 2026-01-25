import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const deleteApiKeyResolver: MutationResolvers<GraphqlContext>['deleteApiKey'] = async (
  _parent,
  args,
  context
) => {
  return await context.handlers.apiKeys.deleteApiKey(args);
};
