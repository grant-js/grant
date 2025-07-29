import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { updatePermission as updatePermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';
import {
  UpdatePermissionParams,
  UpdatePermissionResult,
} from '@/graphql/providers/permissions/types';

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
