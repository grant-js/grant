import { QueryRoleTagsArgs, RoleTag } from '@/graphql/generated/types';

import { getRoleTagsByRoleId } from './dataStore';
export const getRoleTags = async (params: QueryRoleTagsArgs): Promise<RoleTag[]> => {
  const { roleId, scope } = params;
  return getRoleTagsByRoleId(scope, roleId);
};
