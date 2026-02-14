import { RoleGroupModel, roleGroups } from '@grantjs/database';
import {
  AddRoleGroupInput,
  QueryRoleGroupsInput,
  RemoveRoleGroupInput,
  RoleGroup,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IRoleGroupRepository } from '@grantjs/core';

export class RoleGroupRepository
  extends PivotRepository<RoleGroupModel, RoleGroup>
  implements IRoleGroupRepository
{
  protected table = roleGroups;
  protected uniqueIndexFields: Array<keyof RoleGroupModel> = ['roleId', 'groupId'];

  protected toEntity(dbRoleGroup: RoleGroupModel): RoleGroup {
    return dbRoleGroup;
  }

  public async getRoleGroups(
    params: QueryRoleGroupsInput,
    transaction?: Transaction
  ): Promise<RoleGroup[]> {
    return this.query(params, transaction);
  }

  public async addRoleGroup(
    params: AddRoleGroupInput,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    return this.add(params, transaction);
  }

  public async softDeleteRoleGroup(
    params: RemoveRoleGroupInput,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteRoleGroup(
    params: RemoveRoleGroupInput,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    return this.hardDelete(params, transaction);
  }
}
