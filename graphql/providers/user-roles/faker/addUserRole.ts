import { UserRole } from '@/graphql/generated/types';
import { addUserRole as addUserRoleInStore } from '@/graphql/providers/user-roles/faker/dataStore';
import { AddUserRoleParams, AddUserRoleResult } from '@/graphql/providers/user-roles/types';

export async function addUserRole({ input }: AddUserRoleParams): Promise<AddUserRoleResult> {
  const userRoleData = addUserRoleInStore(input.userId, input.roleId);
  return userRoleData as UserRole; // Convert UserRoleData to UserRole for GraphQL
}
