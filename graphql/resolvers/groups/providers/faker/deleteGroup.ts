import { ApiError } from '@/graphql/errors';
import { DeleteGroupParams, DeleteGroupResult } from '../types';
import { deleteGroup as deleteGroupFromStore } from './dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function deleteGroup({ id }: DeleteGroupParams): Promise<DeleteGroupResult> {
  const deletedGroup = deleteGroupFromStore(id);

  if (!deletedGroup) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return true;
}
