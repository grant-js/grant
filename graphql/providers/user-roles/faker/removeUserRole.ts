import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationRemoveUserRoleArgs, UserRole } from '@/graphql/generated/types';
import { deleteUserRoleByUserAndRole } from '@/graphql/providers/user-roles/faker/dataStore';
export async function removeUserRole({ input }: MutationRemoveUserRoleArgs): Promise<UserRole> {
  const deletedUserRole = deleteUserRoleByUserAndRole(input.userId, input.roleId);
  if (!deletedUserRole) {
    throw new ApiError('UserRole not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return deletedUserRole;
}
