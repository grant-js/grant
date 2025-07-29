import { deletePermissionTagByPermissionAndTag } from '@/graphql/providers/permission-tags/faker/dataStore';
import {
  RemovePermissionTagParams,
  RemovePermissionTagResult,
} from '@/graphql/providers/permission-tags/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';

export const removePermissionTag = async (
  params: RemovePermissionTagParams
): Promise<RemovePermissionTagResult> => {
  const { input } = params;
  const { permissionId, tagId } = input;

  // Delete the permission-tag relationship
  const deletedPermissionTag = deletePermissionTagByPermissionAndTag(permissionId, tagId);

  if (!deletedPermissionTag) {
    throw new Error(
      `PermissionTag relationship not found for permission ${permissionId} and tag ${tagId}`
    );
  }

  // Get all permissions and tags for resolution
  const permissions = getPermissions();
  const tags = getTags();

  // Resolve the permission-tag relationship with its related entities
  const permission = permissions.find((p) => p.id === deletedPermissionTag.permissionId);
  const tag = tags.find((t) => t.id === deletedPermissionTag.tagId);

  return {
    ...deletedPermissionTag,
    permission,
    tag,
  };
};
