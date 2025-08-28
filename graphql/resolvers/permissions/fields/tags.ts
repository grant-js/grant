import { PermissionResolvers } from '@/graphql/generated/types';
import { getDirectFieldSelection } from '@/graphql/lib/fieldSelection';
import { getScopedTagIds } from '@/graphql/lib/scopeFiltering';

export const permissionTagsResolver: PermissionResolvers['tags'] = async (
  parent,
  { scope },
  context,
  info
) => {
  const requestedFields = info ? getDirectFieldSelection(info) : undefined;

  const permissionTags = await context.services.permissionTags.getPermissionTags({
    permissionId: parent.id,
  });

  const tagIds = permissionTags.map((pt) => pt.tagId);

  if (tagIds.length === 0) {
    return [];
  }

  const scopedTagIds = await getScopedTagIds({ scope, context });
  const accessibleTagIds = tagIds.filter((id) => scopedTagIds.includes(id));

  if (accessibleTagIds.length === 0) {
    return [];
  }

  const tagsResult = await context.services.tags.getTags({
    ids: accessibleTagIds,
    limit: -1,
    requestedFields,
  });

  return tagsResult.tags;
};
