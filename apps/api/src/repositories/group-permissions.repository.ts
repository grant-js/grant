import type { IGroupPermissionRepository } from '@grantjs/core';
import { GroupPermissionModel, groupPermissions } from '@grantjs/database';
import {
  AddGroupPermissionInput,
  GroupPermission,
  QueryGroupPermissionsInput,
  RemoveGroupPermissionInput,
  Scope,
} from '@grantjs/schema';
import { and, count, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { accessibleIdSource, PivotRepository } from '@/repositories/common';

export class GroupPermissionRepository
  extends PivotRepository<GroupPermissionModel, GroupPermission>
  implements IGroupPermissionRepository
{
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

  public async countGroupPermissions(
    params: { groupId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ groupId: params.groupId }, transaction);
  }

  public async countGroupPermissionsByGroupIds(
    groupIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('groupId', groupIds, transaction);
  }

  /** Groups of the scope that hold each permission, one grouped query. */
  public async countGroupsByPermissionIds(
    permissionIds: string[],
    scope: Scope,
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    if (permissionIds.length === 0) {
      return new Map();
    }
    const scopedGroups = accessibleIdSource('groups', scope);
    if (scopedGroups.kind !== 'sql') {
      return new Map();
    }

    const db = transaction || this.db;
    const rows = await db
      .select({ permissionId: groupPermissions.permissionId, count: count() })
      .from(groupPermissions)
      .where(
        and(
          inArray(groupPermissions.permissionId, permissionIds),
          isNull(groupPermissions.deletedAt),
          sql`${groupPermissions.groupId} IN ${scopedGroups.sql}`
        )
      )
      .groupBy(groupPermissions.permissionId);

    return new Map(rows.map((row) => [String(row.permissionId), Number(row.count)]));
  }

  public async addGroupPermission(
    params: AddGroupPermissionInput,
    transaction?: Transaction
  ): Promise<GroupPermission> {
    return this.add(params, transaction);
  }

  public async addGroupPermissions(
    params: readonly AddGroupPermissionInput[],
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    return this.addMany(params, transaction);
  }

  public async getGroupPermissionsByGroupIds(
    groupIds: string[],
    transaction?: Transaction
  ): Promise<GroupPermission[]> {
    return this.queryByFieldValues('groupId', groupIds, transaction);
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
