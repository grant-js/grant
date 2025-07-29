import { ApolloServerErrorCode } from '@apollo/server/errors';

import { ApiError } from '@/graphql/errors';
import { RoleGroup } from '@/graphql/generated/types';
import { deleteRoleGroupByGroupAndRole } from '@/graphql/providers/role-groups/faker/dataStore';
import {
  RemoveRoleGroupParams,
  RemoveRoleGroupResult,
} from '@/graphql/providers/role-groups/types';

export async function removeRoleGroup({
  input,
}: RemoveRoleGroupParams): Promise<RemoveRoleGroupResult> {
  const deletedRoleGroup = deleteRoleGroupByGroupAndRole(input.groupId, input.roleId);

  if (!deletedRoleGroup) {
    throw new ApiError('RoleGroup not found', ApolloServerErrorCode.PERSISTED_QUERY_NOT_FOUND);
  }

  return deletedRoleGroup as RoleGroup; // Convert RoleGroupData to RoleGroup for GraphQL
}
