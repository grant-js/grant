import { RoleTagModel, roleTags } from '@logusgraphics/grant-database';
import { AddRoleTagInput, RoleTag, UpdateRoleTagInput } from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

export class RoleTagRepository extends PivotRepository<RoleTagModel, RoleTag> {
  protected table = roleTags;
  protected parentIdField: keyof RoleTagModel = 'roleId';
  protected relatedIdField: keyof RoleTagModel = 'tagId';

  protected toEntity(dbPivot: RoleTagModel): RoleTag {
    return {
      id: dbPivot.id,
      roleId: dbPivot.roleId,
      tagId: dbPivot.tagId,
      isPrimary: dbPivot.isPrimary,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getRoleTags(
    params: { roleId?: string; tagId?: string },
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    return this.query({ parentId: params.roleId, relatedId: params.tagId }, transaction);
  }

  public async getRoleTag(
    params: { roleId: string; tagId: string },
    transaction?: Transaction
  ): Promise<RoleTag> {
    const result = await this.getRoleTags(params, transaction);
    return this.first(result);
  }

  public async getRoleTagIntersection(
    params: {
      roleIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    return this.queryIntersection(
      { parentIds: params.roleIds, relatedIds: params.tagIds },
      transaction
    );
  }

  public async addRoleTag(params: AddRoleTagInput, transaction?: Transaction): Promise<RoleTag> {
    const { roleId, tagId, isPrimary } = params;
    return this.add({ parentId: roleId, relatedId: tagId, isPrimary }, transaction);
  }

  public async updateRoleTag(
    params: UpdateRoleTagInput,
    transaction?: Transaction
  ): Promise<RoleTag> {
    const { roleId, tagId, isPrimary } = params;
    return this.update(roleId, tagId, { isPrimary }, transaction);
  }

  public async softDeleteRoleTag(
    params: { roleId: string; tagId: string },
    transaction?: Transaction
  ): Promise<RoleTag> {
    return this.softDelete(
      {
        parentId: params.roleId,
        relatedId: params.tagId,
      },
      transaction
    );
  }

  public async hardDeleteRoleTag(
    params: { roleId: string; tagId: string },
    transaction?: Transaction
  ): Promise<RoleTag> {
    return this.hardDelete(
      {
        parentId: params.roleId,
        relatedId: params.tagId,
      },
      transaction
    );
  }
}
