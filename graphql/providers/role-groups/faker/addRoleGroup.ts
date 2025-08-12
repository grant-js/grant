import { MutationAddRoleGroupArgs, RoleGroup } from '@/graphql/generated/types';
import { addRoleGroup as addRoleGroupInStore } from '@/graphql/providers/role-groups/faker/dataStore';
export async function addRoleGroup({ input }: MutationAddRoleGroupArgs): Promise<RoleGroup> {
  return addRoleGroupInStore(input.groupId, input.roleId);
}
