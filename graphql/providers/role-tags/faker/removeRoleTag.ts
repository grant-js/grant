import { RemoveRoleTagParams, RemoveRoleTagResult } from '@/graphql/providers/role-tags/types';

import { deleteRoleTagByRoleAndTag } from './dataStore';

export const removeRoleTag = async (params: RemoveRoleTagParams): Promise<RemoveRoleTagResult> => {
  const { input } = params;
  const deletedRoleTag = deleteRoleTagByRoleAndTag(input.roleId, input.tagId);

  if (!deletedRoleTag) {
    throw new Error(
      `RoleTag relationship not found for role ${input.roleId} and tag ${input.tagId}`
    );
  }

  return deletedRoleTag;
};
