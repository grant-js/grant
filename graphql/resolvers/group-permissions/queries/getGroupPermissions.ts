import { QueryResolvers } from '@/graphql/generated/types';

export const getGroupPermissionsResolver: QueryResolvers['groupPermissions'] = async (
  _parent,
  { groupId, scope },
  context
) => {
  const groupPermissions = await context.providers.groupPermissions.getGroupPermissions({
    groupId,
    scope,
  });
  return groupPermissions;
};
