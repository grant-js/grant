import { GroupPermission, QueryGroupPermissionsArgs } from '@/graphql/generated/types';
import { getGroupPermissionsByGroupId } from '@/graphql/providers/group-permissions/faker/dataStore';

export const getGroupPermissions = async ({
  groupId,
  scope,
}: QueryGroupPermissionsArgs): Promise<GroupPermission[]> => {
  const groupPermissions = getGroupPermissionsByGroupId(scope, groupId);
  return groupPermissions;
};
