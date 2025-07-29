import { QueryResolvers } from '@/graphql/generated/types';

export const getTagsResolver: QueryResolvers['getTags'] = async (
  _parent: any,
  { page = 1, limit = 10, search, sort, ids }: any,
  context: any
) => {
  const tags = await context.providers.tags.getTags({ page, limit, search, sort, ids });
  return tags;
};
