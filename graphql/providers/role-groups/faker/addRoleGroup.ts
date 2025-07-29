import { RoleGroup } from '@/graphql/generated/types';
import { addRoleGroup as addRoleGroupInStore } from '@/graphql/providers/role-groups/faker/dataStore';

import { AddRoleGroupParams, AddRoleGroupResult } from '../types';

export async function addRoleGroup({ input }: AddRoleGroupParams): Promise<AddRoleGroupResult> {
  const roleGroupData = addRoleGroupInStore(input.groupId, input.roleId);
  return roleGroupData as RoleGroup; // Convert RoleGroupData to RoleGroup for GraphQL
}
