import { UserRole } from '@/graphql/generated/types';
import { getUserRolesByUserId } from '@/graphql/providers/user-roles/faker/dataStore';
import { GetUserRolesParams, GetUserRolesResult } from '@/graphql/providers/user-roles/types';

export async function getUserRoles({
  userId,
  scope,
}: GetUserRolesParams): Promise<GetUserRolesResult> {
  const userRoleData = getUserRolesByUserId(scope, userId);
  return userRoleData as UserRole[]; // Convert UserRoleData to UserRole for GraphQL
}
