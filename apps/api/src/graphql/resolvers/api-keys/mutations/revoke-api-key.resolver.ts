import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const revokeApiKeyResolver: MutationResolvers<GraphqlContext>['revokeApiKey'] = async (
  _parent,
  args,
  context
) => {
  return await context.handlers.apiKeys.revokeApiKey(args);
};
