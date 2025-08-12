import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { Group, MutationUpdateGroupArgs } from '@/graphql/generated/types';
import { updateGroup as updateGroupInStore } from '@/graphql/providers/groups/faker/dataStore';
export async function updateGroup({ id, input }: MutationUpdateGroupArgs): Promise<Group> {
  const updatedGroupData = updateGroupInStore(id, input);
  if (!updatedGroupData) {
    throw new ApiError('Group not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return updatedGroupData;
}
