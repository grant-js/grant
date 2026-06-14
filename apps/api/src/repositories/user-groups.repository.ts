import type { IUserGroupRepository } from '@grantjs/core';
import { UserGroupModel, userGroups } from '@grantjs/database';
import {
  AddUserGroupInput,
  QueryUserGroupsInput,
  RemoveUserGroupInput,
  UserGroup,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

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

  public async countUserGroups(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ userId: params.userId }, transaction);
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
