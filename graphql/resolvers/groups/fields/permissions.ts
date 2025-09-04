import { GroupResolvers } from '@/graphql/generated/types';

export const groupPermissionsResolver: GroupResolvers['permissions'] = async (
  parent,
  _args,
  context
) => {
  const groupId = parent.id;

  if (parent.permissions) {
    return parent.permissions;
  }

  return await context.controllers.groups.getGroupPermissions({
    groupId,
    requestedFields: ['permissions'],
  });
};
