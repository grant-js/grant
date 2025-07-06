import { ApiError } from '@/graphql/errors';
import {
  UpdatePermissionParams,
  UpdatePermissionResult,
} from '@/graphql/providers/permissions/types';
import { updatePermission as updatePermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function updatePermission({
  id,
  input,
}: UpdatePermissionParams): Promise<UpdatePermissionResult> {
  const updatedPermission = updatePermissionInStore(id, input);

  if (!updatedPermission) {
    throw new ApiError('Permission not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return updatedPermission;
}
