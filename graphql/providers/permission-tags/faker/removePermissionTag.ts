import { MutationRemovePermissionTagArgs } from '@/graphql/generated/types';
import { deletePermissionTagByPermissionAndTag } from '@/graphql/providers/permission-tags/faker/dataStore';

export const removePermissionTag = async ({
  input,
}: MutationRemovePermissionTagArgs): Promise<boolean> => {
  const { permissionId, tagId } = input;

  // Delete the permission-tag relationship
  const deletedPermissionTag = deletePermissionTagByPermissionAndTag(permissionId, tagId);

  if (!deletedPermissionTag) {
    throw new Error(
      `PermissionTag relationship not found for permission ${permissionId} and tag ${tagId}`
    );
  }

  return deletedPermissionTag !== null;
};
