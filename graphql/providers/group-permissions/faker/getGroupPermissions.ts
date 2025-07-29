import {
  GetGroupPermissionsParams,
  GetGroupPermissionsResult,
} from '@/graphql/providers/group-permissions/types';

import { getGroupPermissionsByGroupId } from './dataStore';

export const getGroupPermissions = async ({
  groupId,
}: GetGroupPermissionsParams): Promise<GetGroupPermissionsResult> => {
  const groupPermissions = getGroupPermissionsByGroupId(groupId);
  return groupPermissions;
};
