import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationDeleteUserArgs, User } from '@/graphql/generated/types';
import { deleteUser as deleteUserFromStore } from '@/graphql/providers/users/faker/dataStore';

export async function deleteUser({ id }: MutationDeleteUserArgs): Promise<User> {
  const deletedUser = deleteUserFromStore(id);

  if (!deletedUser) {
    throw new ApiError('User not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedUser as User;
}
