import { ApiError } from '@/graphql/errors';
import { DeleteRoleParams, DeleteRoleResult } from '../types';
import { deleteRole as deleteRoleFromStore } from './dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function deleteRole({ id }: DeleteRoleParams): Promise<DeleteRoleResult> {
  const deletedRole = deleteRoleFromStore(id);

  if (!deletedRole) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return true;
}
