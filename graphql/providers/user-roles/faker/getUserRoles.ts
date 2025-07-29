import { UserRole } from '@/graphql/generated/types';
import { getUserRolesByUserId } from '@/graphql/providers/user-roles/faker/dataStore';
import { GetUserRolesParams, GetUserRolesResult } from '@/graphql/providers/user-roles/types';

export async function getUserRoles({ userId }: GetUserRolesParams): Promise<GetUserRolesResult> {
  const userRoleData = getUserRolesByUserId(userId);
  return userRoleData as UserRole[]; // Convert UserRoleData to UserRole for GraphQL
}
