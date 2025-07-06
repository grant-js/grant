import { ApiError } from '@/graphql/errors';
import { UpdateGroupParams, UpdateGroupResult } from '../types';
import { updateGroup as updateGroupInStore } from './dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function updateGroup({ id, input }: UpdateGroupParams): Promise<UpdateGroupResult> {
  const updatedGroup = updateGroupInStore(id, input);

  if (!updatedGroup) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedGroup;
}
