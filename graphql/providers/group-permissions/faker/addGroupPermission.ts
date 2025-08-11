import { GroupPermission, MutationAddGroupPermissionArgs } from '@/graphql/generated/types';
import { getGroups } from '@/graphql/providers/groups/faker/dataStore';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';

import { addGroupPermission as addGroupPermissionData } from './dataStore';

export const addGroupPermission = async (
  params: MutationAddGroupPermissionArgs
): Promise<GroupPermission> => {
  const { input } = params;
  const { groupId, permissionId } = input;

  // Verify that the group and permission exist
  const groups = getGroups();
  const permissions = getPermissions();

  const groupData = groups.find((g) => g.id === groupId);
  const permission = permissions.find((p) => p.id === permissionId);

  if (!groupData) {
    throw new Error(`Group with ID ${groupId} not found`);
  }

  if (!permission) {
    throw new Error(`Permission with ID ${permissionId} not found`);
  }

  // Add the group-permission relationship
  const groupPermissionData = addGroupPermissionData(groupId, permissionId);

  // Map GroupData to Group by adding the permissions field
  const group = { ...groupData, permissions: [] };

  // Return the resolved relationship
  return {
    id: groupPermissionData.id,
    groupId: groupPermissionData.groupId,
    permissionId: groupPermissionData.permissionId,
    createdAt: groupPermissionData.createdAt,
    updatedAt: groupPermissionData.updatedAt,
    group,
    permission,
  };
};
