import { TagModel } from '@grantjs/database';
import { QueryResolvers } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getTagsResolver: QueryResolvers<GraphqlContext>['tags'] = async (
  _parent,
  { scope, page = 1, limit = 10, sort, search, ids },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof TagModel>(info, ['tags']);

  const tags = await context.handlers.tags.getTags({
    scope,
    page,
    limit,
    sort,
    search,
    ids,
    requestedFields,
  });

  return tags;
};
