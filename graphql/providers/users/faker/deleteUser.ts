import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { User } from '@/graphql/generated/types';
import { deleteUser as deleteUserFromStore } from '@/graphql/providers/users/faker/dataStore';
import { DeleteUserParams, DeleteUserResult } from '@/graphql/providers/users/types';

export async function deleteUser({ id }: DeleteUserParams): Promise<DeleteUserResult> {
  const deletedUser = deleteUserFromStore(id);

  if (!deletedUser) {
    throw new ApiError('User not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedUser as User;
}
