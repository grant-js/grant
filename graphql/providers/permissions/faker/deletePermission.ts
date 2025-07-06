import { ApiError } from '@/graphql/errors';
import {
  DeletePermissionParams,
  DeletePermissionResult,
} from '@/graphql/providers/permissions/types';
import { deletePermission as deletePermissionFromStore } from '@/graphql/providers/permissions/faker/dataStore';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export async function deletePermission({
  id,
}: DeletePermissionParams): Promise<DeletePermissionResult> {
  const deletedPermission = deletePermissionFromStore(id);

  if (!deletedPermission) {
    throw new ApiError('Permission not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return true;
}
