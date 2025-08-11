import { QueryPermissionTagsArgs } from '@/graphql/generated/types';
import { PermissionTag } from '@/graphql/generated/types';
import { getPermissionTagsByPermissionId } from '@/graphql/providers/permission-tags/faker/dataStore';

export const getPermissionTags = async (
  params: QueryPermissionTagsArgs
): Promise<PermissionTag[]> => {
  const { permissionId, scope } = params;

  const permissionTags = getPermissionTagsByPermissionId(scope, permissionId);

  return permissionTags;
};
