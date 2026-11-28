import type { IUserRoleRepository } from '@grantjs/core';
import { UserRoleModel, userRoles } from '@grantjs/database';
import {
  AddUserRoleInput,
  QueryUserRolesInput,
  RemoveUserRoleInput,
  Scope,
  UserRole,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  countDirectUsersByOwnerIds,
  getDirectUserIdsByOwnerId,
  PivotRepository,
} from '@/repositories/common';

/** `user_roles` is the only role assignment table: a project reads it through its users. */
const ROLE_ASSIGNMENT_PIVOTS = {
  global: {
    table: userRoles,
    userId: userRoles.userId,
    ownerId: userRoles.roleId,
    deletedAt: userRoles.deletedAt,
  },
};

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

  public async getUserRolesByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<UserRole[]> {
    return this.queryByFieldValues('userId', userIds, transaction);
  }

  public async countUserRoles(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ userId: params.userId }, transaction);
  }

  public async countUserRolesByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('userId', userIds, transaction);
  }

  public async countUsersByRoleIds(
    roleIds: string[],
    scope: Scope,
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return countDirectUsersByOwnerIds(
      transaction || this.db,
      ROLE_ASSIGNMENT_PIVOTS,
      roleIds,
      scope
    );
  }

  public async getUserIdsByRoleId(
    params: { roleId: string; scope: Scope },
    transaction?: Transaction
  ): Promise<string[]> {
    return getDirectUserIdsByOwnerId(
      transaction || this.db,
      ROLE_ASSIGNMENT_PIVOTS,
      params.roleId,
      params.scope
    );
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    return this.add(params, transaction);
  }

  public async addUserRoles(
    params: readonly AddUserRoleInput[],
    transaction?: Transaction
  ): Promise<UserRole[]> {
    return this.addMany(params, transaction);
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
