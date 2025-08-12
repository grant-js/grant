import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationDeleteRoleArgs, Role } from '@/graphql/generated/types';
import { deleteRole as deleteRoleFromStore } from '@/graphql/providers/roles/faker/dataStore';
export async function deleteRole({ id }: MutationDeleteRoleArgs): Promise<Role> {
  const deletedRole = deleteRoleFromStore(id);
  if (!deletedRole) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return deletedRole;
}
