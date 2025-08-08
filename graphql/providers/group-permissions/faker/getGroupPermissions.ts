import {
  GetGroupPermissionsParams,
  GetGroupPermissionsResult,
} from '@/graphql/providers/group-permissions/types';

import { getGroupPermissionsByGroupId } from './dataStore';

export const getGroupPermissions = async ({
  groupId,
  scope,
}: GetGroupPermissionsParams): Promise<GetGroupPermissionsResult> => {
  const groupPermissions = getGroupPermissionsByGroupId(scope, groupId);
  return groupPermissions;
};
