import { MutationRemoveGroupPermissionArgs } from '@/graphql/generated/types';
import { deleteGroupPermissionByGroupAndPermission } from '@/graphql/providers/group-permissions/faker/dataStore';

export const removeGroupPermission = async (
  params: MutationRemoveGroupPermissionArgs
): Promise<boolean> => {
  const { input } = params;
  const { groupId, permissionId } = input;

  // Remove the group-permission relationship
  const deletedGroupPermission = deleteGroupPermissionByGroupAndPermission(groupId, permissionId);

  if (!deletedGroupPermission) {
    throw new Error(
      `Group-permission relationship not found for group ${groupId} and permission ${permissionId}`
    );
  }

  return deletedGroupPermission !== null;
};
