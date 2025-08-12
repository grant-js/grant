import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationUpdateRoleArgs, Role } from '@/graphql/generated/types';
import { updateRole as updateRoleInStore } from '@/graphql/providers/roles/faker/dataStore';
export async function updateRole({ id, input }: MutationUpdateRoleArgs): Promise<Role> {
  const updatedRoleData = updateRoleInStore(id, input);
  if (!updatedRoleData) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return updatedRoleData;
}
