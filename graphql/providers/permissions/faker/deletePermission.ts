import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationDeletePermissionArgs, Permission } from '@/graphql/generated/types';
import { deletePermission as deletePermissionFromStore } from '@/graphql/providers/permissions/faker/dataStore';
export async function deletePermission({ id }: MutationDeletePermissionArgs): Promise<Permission> {
  const deletedPermission = deletePermissionFromStore(id);
  if (!deletedPermission) {
    throw new ApiError('Permission not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return deletedPermission;
}
