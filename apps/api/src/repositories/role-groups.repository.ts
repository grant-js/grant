import type { IRoleGroupRepository } from '@grantjs/core';
import { RoleGroupModel, roleGroups } from '@grantjs/database';
import {
  AddRoleGroupInput,
  QueryRoleGroupsInput,
  RemoveRoleGroupInput,
  RoleGroup,
  Scope,
} from '@grantjs/schema';
import { and, count, inArray, isNull, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import { accessibleIdSource, PivotRepository } from '@/repositories/common';

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

  public async countRoleGroups(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ roleId: params.roleId }, transaction);
  }

  public async countRoleGroupsByRoleIds(
    roleIds: string[],
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    return this.countActiveByFieldValues('roleId', roleIds, transaction);
  }

  /** Roles of the scope that include each group, one grouped query. */
  public async countRolesByGroupIds(
    groupIds: string[],
    scope: Scope,
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    if (groupIds.length === 0) {
      return new Map();
    }
    const scopedRoles = accessibleIdSource('roles', scope);
    if (scopedRoles.kind !== 'sql') {
      return new Map();
    }

    const db = transaction || this.db;
    const rows = await db
      .select({ groupId: roleGroups.groupId, count: count() })
      .from(roleGroups)
      .where(
        and(
          inArray(roleGroups.groupId, groupIds),
          isNull(roleGroups.deletedAt),
          sql`${roleGroups.roleId} IN ${scopedRoles.sql}`
        )
      )
      .groupBy(roleGroups.groupId);

    return new Map(rows.map((row) => [String(row.groupId), Number(row.count)]));
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
