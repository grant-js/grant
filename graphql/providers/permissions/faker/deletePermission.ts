import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { deletePermission as deletePermissionFromStore } from '@/graphql/providers/permissions/faker/dataStore';
import {
  DeletePermissionParams,
  DeletePermissionResult,
} from '@/graphql/providers/permissions/types';

export async function deletePermission({
  id,
}: DeletePermissionParams): Promise<DeletePermissionResult> {
  const deletedPermission = deletePermissionFromStore(id);

  if (!deletedPermission) {
    throw new ApiError('Permission not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return true;
}
