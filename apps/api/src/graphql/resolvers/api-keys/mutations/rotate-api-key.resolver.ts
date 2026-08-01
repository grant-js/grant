import { MutationResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';

export const rotateApiKeyResolver: MutationResolvers<GraphqlContext>['rotateApiKey'] = async (
  _parent,
  args,
  context
) => {
  return await context.handlers.apiKeys.rotateApiKey(args);
};
