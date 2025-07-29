import { getPermissionTagsByPermissionId } from '@/graphql/providers/permission-tags/faker/dataStore';
import {
  GetPermissionTagsParams,
  GetPermissionTagsResult,
} from '@/graphql/providers/permission-tags/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';

export const getPermissionTags = async (
  params: GetPermissionTagsParams
): Promise<GetPermissionTagsResult> => {
  const { permissionId } = params;

  // Get the permission-tag relationships for the specified permission
  const permissionTagData = getPermissionTagsByPermissionId(permissionId);

  // Get all permissions and tags for resolution
  const permissions = getPermissions();
  const tags = getTags();

  // Resolve the permission-tag relationships with their related entities
  const permissionTags = permissionTagData.map((pt) => {
    const permission = permissions.find((p) => p.id === pt.permissionId);
    const tag = tags.find((t) => t.id === pt.tagId);

    return {
      ...pt,
      permission,
      tag,
    };
  });

  return permissionTags;
};
