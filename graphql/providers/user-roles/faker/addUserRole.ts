import { MutationAddUserRoleArgs, UserRole } from '@/graphql/generated/types';
import { addUserRole as addUserRoleInStore } from '@/graphql/providers/user-roles/faker/dataStore';

export async function addUserRole({ input }: MutationAddUserRoleArgs): Promise<UserRole> {
  return addUserRoleInStore(input.userId, input.roleId);
}
