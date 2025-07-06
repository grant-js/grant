import { ApiError } from '@/graphql/errors';
import { UpdateUserParams, UpdateUserResult } from '@/graphql/providers/users/types';
import { updateUser as updateUserInStore } from '@/graphql/providers/users/faker/dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function updateUser({ id, input }: UpdateUserParams): Promise<UpdateUserResult> {
  const updatedUser = updateUserInStore(id, input);

  if (!updatedUser) {
    throw new ApiError('User not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedUser;
}
