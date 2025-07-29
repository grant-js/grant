import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { updateGroup as updateGroupInStore } from '@/graphql/providers/groups/faker/dataStore';
import { UpdateGroupParams, UpdateGroupResult } from '@/graphql/providers/groups/types';

export async function updateGroup({ id, input }: UpdateGroupParams): Promise<UpdateGroupResult> {
  const updatedGroupData = updateGroupInStore(id, input);

  if (!updatedGroupData) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return { ...updatedGroupData, permissions: [] };
}
