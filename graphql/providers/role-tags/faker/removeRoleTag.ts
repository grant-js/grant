import { MutationRemoveRoleTagArgs } from '@/graphql/generated/types';
import { RoleTag } from '@/graphql/generated/types';

import { deleteRoleTagByRoleAndTag } from './dataStore';
export const removeRoleTag = async (params: MutationRemoveRoleTagArgs): Promise<RoleTag> => {
  const { input } = params;
  const deletedRoleTag = deleteRoleTagByRoleAndTag(input.roleId, input.tagId);
  if (!deletedRoleTag) {
    throw new Error(
      `RoleTag relationship not found for role ${input.roleId} and tag ${input.tagId}`
    );
  }
  return deletedRoleTag;
};
