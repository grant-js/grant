import { MutationRemoveGroupPermissionArgs, GroupPermission } from '@/graphql/generated/types';
import { deleteGroupPermissionByGroupAndPermission } from '@/graphql/providers/group-permissions/faker/dataStore';

export async function removeGroupPermission({
  input,
}: MutationRemoveGroupPermissionArgs): Promise<GroupPermission> {
  const deletedGroupPermission = deleteGroupPermissionByGroupAndPermission(
    input.groupId,
    input.permissionId
  );

  if (!deletedGroupPermission) {
    throw new Error('Group permission relationship not found');
  }

  return deletedGroupPermission;
}
