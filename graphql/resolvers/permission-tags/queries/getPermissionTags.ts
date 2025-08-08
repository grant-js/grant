import { QueryResolvers } from '@/graphql/generated/types';

export const getPermissionTagsResolver: QueryResolvers['permissionTags'] = async (
  _parent,
  { permissionId, scope },
  context
) => {
  const permissionTags = await context.providers.permissionTags.getPermissionTags({
    permissionId,
    scope,
  });
  return permissionTags;
};
