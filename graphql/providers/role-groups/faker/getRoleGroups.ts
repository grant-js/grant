import { QueryRoleGroupsArgs, RoleGroup } from '@/graphql/generated/types';
import { getRoleGroupsByRoleId } from '@/graphql/providers/role-groups/faker/dataStore';
export async function getRoleGroups({ roleId, scope }: QueryRoleGroupsArgs): Promise<RoleGroup[]> {
  const roleGroupData = getRoleGroupsByRoleId(scope, roleId);
  return roleGroupData;
}
