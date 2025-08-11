import { MutationAddRoleTagArgs, RoleTag } from '@/graphql/generated/types';

import { createRoleTag } from './dataStore';

export const addRoleTag = async (params: MutationAddRoleTagArgs): Promise<RoleTag> => {
  const { input } = params;
  return createRoleTag(input.roleId, input.tagId);
};
