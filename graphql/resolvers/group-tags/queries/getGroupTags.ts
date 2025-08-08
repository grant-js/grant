import { QueryResolvers } from '@/graphql/generated/types';

export const getGroupTagsResolver: QueryResolvers['groupTags'] = async (
  _parent,
  { groupId, scope },
  context
) => {
  const groupTags = await context.providers.groupTags.getGroupTags({
    groupId,
    scope,
  });
  return groupTags;
};
