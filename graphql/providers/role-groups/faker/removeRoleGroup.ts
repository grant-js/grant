import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { MutationRemoveRoleGroupArgs, RoleGroup } from '@/graphql/generated/types';
import { deleteRoleGroupByGroupAndRole } from '@/graphql/providers/role-groups/faker/dataStore';

export async function removeRoleGroup({ input }: MutationRemoveRoleGroupArgs): Promise<RoleGroup> {
  const deletedRoleGroup = deleteRoleGroupByGroupAndRole(input.groupId, input.roleId);

  if (!deletedRoleGroup) {
    throw new ApiError('RoleGroup not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedRoleGroup;
}
