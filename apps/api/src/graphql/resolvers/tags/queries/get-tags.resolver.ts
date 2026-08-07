import { QueryResolvers, Tag } from '@grantjs/schema';

import { GraphqlContext } from '@/graphql/types';
import { getDirectFieldSelection } from '@/lib/field-selection.lib';

export const getTagsResolver: QueryResolvers<GraphqlContext>['tags'] = async (
  _parent,
  // No `limit` default here: fall through to the system default applied by
  // EntityRepository, so GraphQL and REST agree on page size.
  { scope, page = 1, limit, sort, search, ids },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof Tag>(info, ['tags']);

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
