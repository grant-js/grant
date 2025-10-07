import { roleGroups, RoleGroupModel } from '@logusgraphics/grant-database';
import { RoleGroup } from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

export class RoleGroupRepository extends PivotRepository<RoleGroupModel, RoleGroup> {
  protected table = roleGroups;
  protected parentIdField: keyof RoleGroupModel = 'roleId';
  protected relatedIdField: keyof RoleGroupModel = 'groupId';

  protected toEntity(dbRoleGroup: RoleGroupModel): RoleGroup {
    return {
      id: dbRoleGroup.id,
      roleId: dbRoleGroup.roleId,
      groupId: dbRoleGroup.groupId,
      createdAt: dbRoleGroup.createdAt,
      updatedAt: dbRoleGroup.updatedAt,
      deletedAt: dbRoleGroup.deletedAt,
    };
  }

  public async getRoleGroups(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<RoleGroup[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.roleId,
    };

    return this.query(baseParams, transaction);
  }

  public async addRoleGroup(
    roleId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const baseParams: BasePivotAddArgs = {
      parentId: roleId,
      relatedId: groupId,
    };

    const roleGroup = await this.add(baseParams, transaction);

    return roleGroup;
  }

  public async softDeleteRoleGroup(
    roleId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: roleId,
      relatedId: groupId,
    };

    const roleGroup = await this.softDelete(baseParams, transaction);

    return roleGroup;
  }

  public async hardDeleteRoleGroup(
    roleId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<RoleGroup> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: roleId,
      relatedId: groupId,
    };

    const roleGroup = await this.hardDelete(baseParams, transaction);

    return roleGroup;
  }
}
