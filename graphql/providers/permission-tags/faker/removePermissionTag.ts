import { MutationRemovePermissionTagArgs, PermissionTag } from '@/graphql/generated/types';
import { deletePermissionTagByPermissionAndTag } from '@/graphql/providers/permission-tags/faker/dataStore';

export async function removePermissionTag({
  input,
}: MutationRemovePermissionTagArgs): Promise<PermissionTag> {
  const deletedPermissionTag = deletePermissionTagByPermissionAndTag(
    input.permissionId,
    input.tagId
  );

  if (!deletedPermissionTag) {
    throw new Error('Permission tag relationship not found');
  }

  return deletedPermissionTag;
}
