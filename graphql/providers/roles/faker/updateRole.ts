import { ApiError } from '@/graphql/errors';
import { UpdateRoleParams, UpdateRoleResult } from '@/graphql/providers/roles/types';
import { updateRole as updateRoleInStore } from '@/graphql/providers/roles/faker/dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function updateRole({ id, input }: UpdateRoleParams): Promise<UpdateRoleResult> {
  const updatedRole = updateRoleInStore(id, input);

  if (!updatedRole) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedRole;
}
