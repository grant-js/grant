import { QueryResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedTagIds } from '@/graphql/lib/scopeFiltering';

export const getTagsResolver: QueryResolvers['tags'] = async (
  _parent,
  { scope, page = 1, limit = 10, sort, search, ids },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info, ['tags']) : undefined;

  let tagIds = await getScopedTagIds({ scope, context });

  if (ids && ids.length > 0) {
    tagIds = tagIds.filter((tagId) => ids.includes(tagId));
  }

  if (tagIds.length === 0) {
    return {
      tags: [],
      totalCount: 0,
      hasNextPage: false,
    };
  }

  const tagsResult = await context.services.tags.getTags({
    ids: tagIds,
    page,
    limit,
    sort,
    search,
    requestedFields,
  });

  return tagsResult;
};
