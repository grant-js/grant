import { RoleResolvers } from '@/graphql/generated/types';

export const roleTagsResolver: RoleResolvers['tags'] = async (
  parent: any,
  _args: any,
  context: any
) => {
  // Get role-tag relationships for this role
  const roleTags = await context.providers.roleTags.getRoleTags({ roleId: parent.id });

  // Extract tag IDs from role-tag relationships
  const tagIds = roleTags.map((rt: any) => rt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
  });

  return tagsResult.tags;
};
