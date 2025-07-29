import {
  RemoveGroupPermissionParams,
  RemoveGroupPermissionResult,
} from '@/graphql/providers/group-permissions/types';

import { deleteGroupPermissionByGroupAndPermission } from './dataStore';

export const removeGroupPermission = async (
  params: RemoveGroupPermissionParams
): Promise<RemoveGroupPermissionResult> => {
  const { input } = params;
  const { groupId, permissionId } = input;

  // Remove the group-permission relationship
  const deletedGroupPermission = deleteGroupPermissionByGroupAndPermission(groupId, permissionId);

  if (!deletedGroupPermission) {
    throw new Error(
      `Group-permission relationship not found for group ${groupId} and permission ${permissionId}`
    );
  }

  return true;
};
