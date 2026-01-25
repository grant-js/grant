import { ApiKey, QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getApiKeysResolver: QueryResolvers<GraphqlContext>['apiKeys'] = async (
  _parent,
  { scope, page, limit, sort, search, ids },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof ApiKey>(info, ['apiKeys']);

  const apiKeys = await context.handlers.apiKeys.getApiKeys({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    requestedFields,
  });

  return apiKeys;
};
