import { AddRoleTagParams, AddRoleTagResult } from '@/graphql/providers/role-tags/types';

import { createRoleTag } from './dataStore';

export const addRoleTag = async (params: AddRoleTagParams): Promise<AddRoleTagResult> => {
  const { input } = params;
  return createRoleTag(input.roleId, input.tagId);
};
