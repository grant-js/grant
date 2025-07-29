import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { deleteGroup as deleteGroupFromStore } from '@/graphql/providers/groups/faker/dataStore';
import { DeleteGroupParams, DeleteGroupResult } from '@/graphql/providers/groups/types';

export async function deleteGroup({ id }: DeleteGroupParams): Promise<DeleteGroupResult> {
  const deletedGroup = deleteGroupFromStore(id);

  if (!deletedGroup) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return true;
}
