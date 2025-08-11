import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationDeleteGroupArgs } from '@/graphql/generated/types';
import { deleteGroup as deleteGroupFromStore } from '@/graphql/providers/groups/faker/dataStore';

export async function deleteGroup({ id }: MutationDeleteGroupArgs): Promise<boolean> {
  const deletedGroup = deleteGroupFromStore(id);

  if (!deletedGroup) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedGroup !== null;
}
