import { PermissionResolvers } from '@/graphql/generated/types';

export const permissionTagsResolver: PermissionResolvers['tags'] = async (
  parent,
  _args,
  context
) => {
  const permissionId = parent.id;

  if (parent.tags) {
    return parent.tags;
  }

  return await context.controllers.permissions.getPermissionTags({
    permissionId,
    requestedFields: ['tags'],
  });
};
