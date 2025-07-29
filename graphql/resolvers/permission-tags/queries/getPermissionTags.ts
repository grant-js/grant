import { QueryResolvers } from '@/graphql/generated/types';

export const getPermissionTagsResolver: QueryResolvers['permissionTags'] = async (
  _parent,
  { permissionId },
  context
) => {
  const permissionTags = await context.providers.permissionTags.getPermissionTags({ permissionId });
  return permissionTags;
};
