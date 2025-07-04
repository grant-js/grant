import { ApiError } from '@/graphql/errors';
import { UpdateRoleParams, UpdateRoleResult } from '../types';
import { updateRole as updateRoleInStore } from './dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function updateRole({ id, input }: UpdateRoleParams): Promise<UpdateRoleResult> {
  const updatedRole = updateRoleInStore(id, input);

  if (!updatedRole) {
    throw new ApiError('Role not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedRole;
}
