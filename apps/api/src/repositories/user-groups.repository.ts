import type { IUserGroupRepository } from '@grantjs/core';
import { projectUserGroups, UserGroupModel, userGroups } from '@grantjs/database';
import {
  AddUserGroupInput,
  QueryUserGroupsInput,
  RemoveUserGroupInput,
  Scope,
  UserGroup,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  countDirectUsersByOwnerIds,
  getDirectUserIdsByOwnerId,
  PivotRepository,
} from '@/repositories/common';

const GROUP_MEMBERSHIP_PIVOTS = {
  global: {
    table: userGroups,
    userId: userGroups.userId,
    ownerId: userGroups.groupId,
    deletedAt: userGroups.deletedAt,
  },
  project: {
    table: projectUserGroups,
    projectId: projectUserGroups.projectId,
    userId: projectUserGroups.userId,
    ownerId: projectUserGroups.groupId,
    deletedAt: projectUserGroups.deletedAt,
  },
};

export class UserGroupRepository
  extends PivotRepository<UserGroupModel, UserGroup>
  implements IUserGroupRepository
{
  protected table = userGroups;
  protected uniqueIndexFields: Array<keyof UserGroupModel> = ['userId', 'groupId'];

  protected toEntity(dbUserGroup: UserGroupModel): UserGroup {
    return dbUserGroup;
  }

  public async getUserGroups(
    params: QueryUserGroupsInput,
    transaction?: Transaction
  ): Promise<UserGroup[]> {
    return this.query(params, transaction);
  }

  public async getUserGroupsByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<UserGroup[]> {
    return this.queryByFieldValues('userId', userIds, transaction);
  }

  public async countUserGroups(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ userId: params.userId }, transaction);
  }

  public async countUserGroupsByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('userId', userIds, transaction);
  }

  public async countUsersByGroupIds(
    groupIds: string[],
    scope: Scope,
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return countDirectUsersByOwnerIds(
      transaction || this.db,
      GROUP_MEMBERSHIP_PIVOTS,
      groupIds,
      scope
    );
  }

  public async getUserIdsByGroupId(
    params: { groupId: string; scope: Scope },
    transaction?: Transaction
  ): Promise<string[]> {
    return getDirectUserIdsByOwnerId(
      transaction || this.db,
      GROUP_MEMBERSHIP_PIVOTS,
      params.groupId,
      params.scope
    );
  }

  public async addUserGroup(
    params: AddUserGroupInput,
    transaction?: Transaction
  ): Promise<UserGroup> {
    return this.add(params, transaction);
  }

  public async softDeleteUserGroup(
    params: RemoveUserGroupInput,
    transaction?: Transaction
  ): Promise<UserGroup> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteUserGroup(
    params: RemoveUserGroupInput,
    transaction?: Transaction
  ): Promise<UserGroup> {
    return this.hardDelete(params, transaction);
  }
}
