import { GroupResolvers } from '@/graphql/generated/types';

export const groupTagsResolver: GroupResolvers['tags'] = async (
  parent: any,
  _args: any,
  context: any
) => {
  // Get group-tag relationships for this group
  const groupTags = await context.providers.groupTags.getGroupTags({ groupId: parent.id });

  // Extract tag IDs from group-tag relationships
  const tagIds = groupTags.map((gt: any) => gt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
  });

  return tagsResult.tags;
};
