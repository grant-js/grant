import { QueryResolvers } from '@/graphql/generated/types';

export const getTagsResolver: QueryResolvers['tags'] = async (
  _parent,
  { page, limit, search, sort, ids, scope },
  context
) => {
  const tags = await context.providers.tags.getTags({ page, limit, search, sort, ids, scope });
  return tags;
};
