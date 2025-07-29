import { createPermissionTag } from '@/graphql/providers/permission-tags/faker/dataStore';
import {
  AddPermissionTagParams,
  AddPermissionTagResult,
} from '@/graphql/providers/permission-tags/types';
import { getPermissions } from '@/graphql/providers/permissions/faker/dataStore';
import { getTags } from '@/graphql/providers/tags/faker/dataStore';

export const addPermissionTag = async (
  params: AddPermissionTagParams
): Promise<AddPermissionTagResult> => {
  const { input } = params;
  const { permissionId, tagId } = input;

  // Create the permission-tag relationship
  const permissionTagData = createPermissionTag(permissionId, tagId);

  // Get all permissions and tags for resolution
  const permissions = getPermissions();
  const tags = getTags();

  // Resolve the permission-tag relationship with its related entities
  const permission = permissions.find((p) => p.id === permissionTagData.permissionId);
  const tag = tags.find((t) => t.id === permissionTagData.tagId);

  return {
    ...permissionTagData,
    permission,
    tag,
  };
};
