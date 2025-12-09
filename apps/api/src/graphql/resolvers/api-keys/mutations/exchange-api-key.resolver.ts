import { MutationResolvers } from '@logusgraphics/grant-schema';

import { GraphqlContext } from '@/graphql/types';

export const exchangeApiKeyResolver: MutationResolvers<GraphqlContext>['exchangeApiKey'] = async (
  _parent,
  args,
  context
) => {
  return await context.handlers.apiKeys.exchangeApiKey(args);
};
