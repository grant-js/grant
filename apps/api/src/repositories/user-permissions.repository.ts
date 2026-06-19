import type { IUserPermissionRepository } from '@grantjs/core';
import { UserPermissionModel, userPermissions } from '@grantjs/database';
import {
  AssignUserPermissionInput,
  QueryUserPermissionsInput,
  RevokeUserPermissionInput,
  UserPermission,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class UserPermissionRepository
  extends PivotRepository<UserPermissionModel, UserPermission>
  implements IUserPermissionRepository
{
  protected table = userPermissions;
  protected uniqueIndexFields: Array<keyof UserPermissionModel> = ['userId', 'permissionId'];

  protected toEntity(dbUserPermission: UserPermissionModel): UserPermission {
    return {
      id: dbUserPermission.id,
      userId: dbUserPermission.userId,
      permissionId: dbUserPermission.permissionId,
      createdAt: dbUserPermission.createdAt,
      updatedAt: dbUserPermission.updatedAt,
      deletedAt: dbUserPermission.deletedAt,
    };
  }

  public async getUserPermissions(
    params: QueryUserPermissionsInput,
    transaction?: Transaction
  ): Promise<UserPermission[]> {
    return this.query(params, transaction);
  }

  public async getUserPermissionsByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<UserPermission[]> {
    return this.queryByFieldValues('userId', userIds, transaction);
  }

  public async countUserPermissions(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ userId: params.userId }, transaction);
  }

  public async countUserPermissionsByUserIds(
    userIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('userId', userIds, transaction);
  }

  public async addUserPermission(
    params: AssignUserPermissionInput,
    transaction?: Transaction
  ): Promise<UserPermission> {
    const { userId, permissionId } = params;
    return this.add({ userId, permissionId }, transaction);
  }

  public async softDeleteUserPermission(
    params: RevokeUserPermissionInput,
    transaction?: Transaction
  ): Promise<UserPermission> {
    const { userId, permissionId } = params;
    return this.softDelete({ userId, permissionId }, transaction);
  }

  public async hardDeleteUserPermission(
    params: RevokeUserPermissionInput,
    transaction?: Transaction
  ): Promise<UserPermission> {
    const { userId, permissionId } = params;
    return this.hardDelete({ userId, permissionId }, transaction);
  }
}
