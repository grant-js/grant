import { QueryUserRolesArgs, UserRole } from '@/graphql/generated/types';
import { getUserRolesByUserId } from '@/graphql/providers/user-roles/faker/dataStore';

export async function getUserRoles({ userId, scope }: QueryUserRolesArgs): Promise<UserRole[]> {
  return getUserRolesByUserId(scope, userId);
}
