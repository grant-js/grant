import { User } from '@/graphql/generated/types';
import { DeleteUserParams, DeleteUserResult } from '../types';
import { deleteUser as deleteUserFromStore } from './dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { ApiError } from '@/graphql/errors';

export async function deleteUser({ id }: DeleteUserParams): Promise<DeleteUserResult> {
  const deletedUser = deleteUserFromStore(id);

  if (!deletedUser) {
    throw new ApiError('User not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedUser;
}
