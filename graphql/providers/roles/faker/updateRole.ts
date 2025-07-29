import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { updateRole as updateRoleInStore } from '@/graphql/providers/roles/faker/dataStore';
import { UpdateRoleParams, UpdateRoleResult } from '@/graphql/providers/roles/types';

export async function updateRole({ id, input }: UpdateRoleParams): Promise<UpdateRoleResult> {
  const updatedRoleData = updateRoleInStore(id, input);

  if (!updatedRoleData) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return { ...updatedRoleData, groups: [] };
}
