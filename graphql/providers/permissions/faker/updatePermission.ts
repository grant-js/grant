import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationUpdatePermissionArgs, Permission } from '@/graphql/generated/types';
import { updatePermission as updatePermissionInStore } from '@/graphql/providers/permissions/faker/dataStore';
export async function updatePermission({
  id,
  input,
}: MutationUpdatePermissionArgs): Promise<Permission> {
  const updatedPermission = updatePermissionInStore(id, input);
  if (!updatedPermission) {
    throw new ApiError('Permission not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }
  return updatedPermission;
}
