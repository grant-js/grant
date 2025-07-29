import { QueryResolvers } from '@/graphql/generated/types';

export const getGroupTagsResolver: QueryResolvers['groupTags'] = async (
  _parent,
  { groupId },
  context
) => {
  const groupTags = await context.providers.groupTags.getGroupTags({ groupId });
  return groupTags;
};
