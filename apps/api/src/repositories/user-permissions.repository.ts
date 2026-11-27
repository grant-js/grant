import type { IUserPermissionRepository } from '@grantjs/core';
import { projectUserPermissions, UserPermissionModel, userPermissions } from '@grantjs/database';
import {
  AssignUserPermissionInput,
  QueryUserPermissionsInput,
  RevokeUserPermissionInput,
  Scope,
  UserPermission,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  countDirectUsersByOwnerIds,
  getDirectUserIdsByOwnerId,
  PivotRepository,
} from '@/repositories/common';

const DIRECT_PERMISSION_PIVOTS = {
  global: {
    table: userPermissions,
    userId: userPermissions.userId,
    ownerId: userPermissions.permissionId,
    deletedAt: userPermissions.deletedAt,
  },
  project: {
    table: projectUserPermissions,
    projectId: projectUserPermissions.projectId,
    userId: projectUserPermissions.userId,
    ownerId: projectUserPermissions.permissionId,
    deletedAt: projectUserPermissions.deletedAt,
  },
};

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

  public async countUsersByPermissionIds(
    permissionIds: string[],
    scope: Scope,
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return countDirectUsersByOwnerIds(
      transaction || this.db,
      DIRECT_PERMISSION_PIVOTS,
      permissionIds,
      scope
    );
  }

  public async getUserIdsByPermissionId(
    params: { permissionId: string; scope: Scope },
    transaction?: Transaction
  ): Promise<string[]> {
    return getDirectUserIdsByOwnerId(
      transaction || this.db,
      DIRECT_PERMISSION_PIVOTS,
      params.permissionId,
      params.scope
    );
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
