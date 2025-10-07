import { TagModel } from '@logusgraphics/grant-database';
import { QueryResolvers } from '@logusgraphics/grant-schema';

import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { GraphqlContext } from '@/graphql/types';

export const getTagsResolver: QueryResolvers<GraphqlContext>['tags'] = async (
  _parent,
  { scope, page = 1, limit = 10, sort, search, ids },
  context,
  info
) => {
  const requestedFields = getDirectFieldSelection<keyof TagModel>(info, ['tags']);

  const tags = await context.controllers.tags.getTags(
    {
      scope,
      page,
      limit,
      sort,
      search,
      ids,
      requestedFields,
    },
    context.user!
  );

  return tags;
};
