import { MutationAddPermissionTagArgs, PermissionTag } from '@/graphql/generated/types';
import { createPermissionTag } from '@/graphql/providers/permission-tags/faker/dataStore';

export const addPermissionTag = async (
  params: MutationAddPermissionTagArgs
): Promise<PermissionTag> => {
  const { input } = params;
  const { permissionId, tagId } = input;

  const permissionTag = createPermissionTag(permissionId, tagId);

  return permissionTag;
};
