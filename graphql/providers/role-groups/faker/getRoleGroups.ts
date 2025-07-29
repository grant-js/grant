import { getRoleGroupsByRoleId } from '@/graphql/providers/role-groups/faker/dataStore';
import { GetRoleGroupsParams, GetRoleGroupsResult } from '@/graphql/providers/role-groups/types';

export async function getRoleGroups({ roleId }: GetRoleGroupsParams): Promise<GetRoleGroupsResult> {
  const roleGroupData = getRoleGroupsByRoleId(roleId);
  return roleGroupData;
}
