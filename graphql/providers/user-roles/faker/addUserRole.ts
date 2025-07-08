import { AddUserRoleParams, AddUserRoleResult } from '@/graphql/providers/user-roles/types';
import { addUserRole as addUserRoleInStore } from '@/graphql/providers/user-roles/faker/dataStore';
import { UserRole } from '@/graphql/generated/types';

export async function addUserRole({ input }: AddUserRoleParams): Promise<AddUserRoleResult> {
  const userRoleData = addUserRoleInStore(input.userId, input.roleId);
  return userRoleData as UserRole; // Convert UserRoleData to UserRole for GraphQL
}
