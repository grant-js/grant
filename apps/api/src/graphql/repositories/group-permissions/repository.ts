import { groupPermissions, GroupPermissionModel } from '@logusgraphics/grant-database';
import {
  GroupPermission,
  AddGroupPermissionInput,
  RemoveGroupPermissionInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';
import { DeleteParams } from '@/graphql/services/common';

export class GroupPermissionRepository extends PivotRepository<
  GroupPermissionModel,
  GroupPermission
> {
  protected table = groupPermissions;
  protected parentIdField: keyof GroupPermissionModel = 'groupId';
  protected relatedIdField: keyof GroupPermissionModel = 'permissionId';

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
    params: { groupId: string },
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.groupId,
    };

    return this.query(baseParams, transaction);
  }

  public async addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.groupId,
      relatedId: params.permissionId,
    };

    const groupPermission = await this.add(baseParams, transaction);

    return groupPermission;
  }

  public async softDeleteGroupPermission(
    params: RemoveGroupPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.groupId,
      relatedId: params.permissionId,
    };

    const groupPermission = await this.softDelete(baseParams, transaction);

    return groupPermission;
  }

  public async hardDeleteGroupPermission(
    params: RemoveGroupPermissionInput & DeleteParams,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.groupId,
      relatedId: params.permissionId,
    };

    const groupPermission = await this.hardDelete(baseParams, transaction);

    return groupPermission;
  }
}
