import { userRoles, UserRoleModel } from '@logusgraphics/grant-database';
import { AddUserRoleInput, RemoveUserRoleInput, UserRole } from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

export class UserRoleRepository extends PivotRepository<UserRoleModel, UserRole> {
  protected table = userRoles;
  protected parentIdField: keyof UserRoleModel = 'userId';
  protected relatedIdField: keyof UserRoleModel = 'roleId';

  protected toEntity(dbUserRole: UserRoleModel): UserRole {
    return {
      id: dbUserRole.id,
      userId: dbUserRole.userId,
      roleId: dbUserRole.roleId,
      createdAt: dbUserRole.createdAt,
      updatedAt: dbUserRole.updatedAt,
      deletedAt: dbUserRole.deletedAt,
    };
  }

  public async getUserRoles(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<UserRole[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.userId,
    };

    return this.query(baseParams, transaction);
  }

  public async addUserRole(params: AddUserRoleInput, transaction?: Transaction): Promise<UserRole> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.userId,
      relatedId: params.roleId,
    };

    const userRole = await this.add(baseParams, transaction);

    return userRole;
  }

  public async softDeleteUserRole(
    params: RemoveUserRoleInput,
    transaction?: Transaction
  ): Promise<UserRole> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.userId,
      relatedId: params.roleId,
    };

    const userRole = await this.softDelete(baseParams, transaction);

    return userRole;
  }

  public async hardDeleteUserRole(
    params: RemoveUserRoleInput,
    transaction?: Transaction
  ): Promise<UserRole> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.userId,
      relatedId: params.roleId,
    };

    const userRole = await this.hardDelete(baseParams, transaction);

    return userRole;
  }
}
