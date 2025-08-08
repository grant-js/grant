import { GetRoleTagsParams, GetRoleTagsResult } from '@/graphql/providers/role-tags/types';

import { getRoleTagsByRoleId } from './dataStore';

export const getRoleTags = async (params: GetRoleTagsParams): Promise<GetRoleTagsResult> => {
  const { roleId, scope } = params;
  return getRoleTagsByRoleId(scope, roleId);
};
