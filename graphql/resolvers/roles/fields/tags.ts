import { RoleResolvers } from '@/graphql/generated/types';

export const roleTagsResolver: RoleResolvers['tags'] = async (parent, { scope }, context) => {
  // Get role-tag relationships for this role
  const roleTags = await context.providers.roleTags.getRoleTags({
    roleId: parent.id,
    scope,
  });

  // Extract tag IDs from role-tag relationships
  const tagIds = roleTags.map((rt) => rt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs with scope (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
    scope,
    limit: -1,
  });

  return tagsResult.tags;
};
