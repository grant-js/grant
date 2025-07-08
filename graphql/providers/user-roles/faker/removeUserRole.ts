import { RemoveUserRoleParams, RemoveUserRoleResult } from '@/graphql/providers/user-roles/types';
import { deleteUserRoleByUserAndRole } from '@/graphql/providers/user-roles/faker/dataStore';
import { ApiError } from '@/graphql/errors';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { UserRole } from '@/graphql/generated/types';

export async function removeUserRole({
  input,
}: RemoveUserRoleParams): Promise<RemoveUserRoleResult> {
  const deletedUserRole = deleteUserRoleByUserAndRole(input.userId, input.roleId);

  if (!deletedUserRole) {
    throw new ApiError('UserRole not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedUserRole as UserRole; // Convert UserRoleData to UserRole for GraphQL
}
