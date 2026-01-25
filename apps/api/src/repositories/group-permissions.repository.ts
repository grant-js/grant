import { GroupPermissionModel, groupPermissions } from '@grantjs/database';
import {
  AddGroupPermissionInput,
  GroupPermission,
  QueryGroupPermissionsInput,
  RemoveGroupPermissionInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class GroupPermissionRepository extends PivotRepository<
  GroupPermissionModel,
  GroupPermission
> {
  protected table = groupPermissions;
  protected uniqueIndexFields: Array<keyof GroupPermissionModel> = ['groupId', 'permissionId'];

  protected toEntity(dbGroupPermission: GroupPermissionModel): GroupPermission {
    return {
      id: dbGroupPermission.id,
      groupId: dbGroupPermission.groupId,
      permissionId: dbGroupPermission.permissionId,
      createdAt: dbGroupPermission.createdAt,
      updatedAt: dbGroupPermission.updatedAt,
      deletedAt: dbGroupPermission.deletedAt,
    };
  }

  public async getGroupPermissions(
    params: QueryGroupPermissionsInput,
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    return this.query(params, transaction);
  }

  public async addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    return this.add(params, transaction);
  }

  public async softDeleteGroupPermission(
    params: RemoveGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteGroupPermission(
    params: RemoveGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    return this.hardDelete(params, transaction);
  }
}
