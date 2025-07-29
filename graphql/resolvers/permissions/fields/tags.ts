import { PermissionResolvers } from '@/graphql/generated/types';

export const permissionTagsResolver: PermissionResolvers['tags'] = async (
  parent: any,
  _args: any,
  context: any
) => {
  // Get permission-tag relationships for this permission
  const permissionTags = await context.providers.permissionTags.getPermissionTags({
    permissionId: parent.id,
  });

  // Extract tag IDs from permission-tag relationships
  const tagIds = permissionTags.map((pt: any) => pt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  // Get tags by IDs (optimized - no need to fetch all tags)
  const tagsResult = await context.providers.tags.getTags({
    ids: tagIds,
  });

  return tagsResult.tags;
};
