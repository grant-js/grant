import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationUpdateUserArgs, User } from '@/graphql/generated/types';
import { updateUser as updateUserInStore } from '@/graphql/providers/users/faker/dataStore';

export async function updateUser({ id, input }: MutationUpdateUserArgs): Promise<User> {
  const updatedUser = updateUserInStore(id, input);

  if (!updatedUser) {
    throw new ApiError('User not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedUser;
}
