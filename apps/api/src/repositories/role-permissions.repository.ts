import type { IRolePermissionRepository } from '@grantjs/core';
import { RolePermissionModel, rolePermissions } from '@grantjs/database';
import {
  AssignRolePermissionInput,
  QueryRolePermissionsInput,
  RevokeRolePermissionInput,
  RolePermission,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class RolePermissionRepository
  extends PivotRepository<RolePermissionModel, RolePermission>
  implements IRolePermissionRepository
{
  protected table = rolePermissions;
  protected uniqueIndexFields: Array<keyof RolePermissionModel> = ['roleId', 'permissionId'];

  protected toEntity(dbRolePermission: RolePermissionModel): RolePermission {
    return {
      id: dbRolePermission.id,
      roleId: dbRolePermission.roleId,
      permissionId: dbRolePermission.permissionId,
      createdAt: dbRolePermission.createdAt,
      updatedAt: dbRolePermission.updatedAt,
      deletedAt: dbRolePermission.deletedAt,
    };
  }

  public async getRolePermissions(
    params: QueryRolePermissionsInput,
    transaction?: Transaction
  ): Promise<RolePermission[]> {
    return this.query(params, transaction);
  }

  public async countRolePermissions(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ roleId: params.roleId }, transaction);
  }

  public async countRolePermissionsByRoleIds(
    roleIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('roleId', roleIds, transaction);
  }

  public async addRolePermission(
    params: AssignRolePermissionInput,
    transaction?: Transaction
  ): Promise<RolePermission> {
    const { roleId, permissionId } = params;
    return this.add({ roleId, permissionId }, transaction);
  }

  public async softDeleteRolePermission(
    params: RevokeRolePermissionInput,
    transaction?: Transaction
  ): Promise<RolePermission> {
    const { roleId, permissionId } = params;
    return this.softDelete({ roleId, permissionId }, transaction);
  }

  public async hardDeleteRolePermission(
    params: RevokeRolePermissionInput,
    transaction?: Transaction
  ): Promise<RolePermission> {
    const { roleId, permissionId } = params;
    return this.hardDelete({ roleId, permissionId }, transaction);
  }
}
