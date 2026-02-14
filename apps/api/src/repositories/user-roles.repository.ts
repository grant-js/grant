import { UserRoleModel, userRoles } from '@grantjs/database';
import {
  AddUserRoleInput,
  QueryUserRolesInput,
  RemoveUserRoleInput,
  UserRole,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

import type { IUserRoleRepository } from '@grantjs/core';

export class UserRoleRepository
  extends PivotRepository<UserRoleModel, UserRole>
  implements IUserRoleRepository
{
  protected table = userRoles;
  protected uniqueIndexFields: Array<keyof UserRoleModel> = ['userId', 'roleId'];

  protected toEntity(dbUserRole: UserRoleModel): UserRole {
    return dbUserRole;
  }

  public async getUserRoles(
    params: QueryUserRolesInput,
    transaction?: Transaction
  ): Promise<UserRole[]> {
    return this.query(params, transaction);
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    return this.add(params, transaction);
  }

  public async softDeleteUserRole(
    params: RemoveUserRoleInput,
    transaction?: Transaction
  ): Promise<UserRole> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteUserRole(
    params: RemoveUserRoleInput,
    transaction?: Transaction
  ): Promise<UserRole> {
    return this.hardDelete(params, transaction);
  }
}
