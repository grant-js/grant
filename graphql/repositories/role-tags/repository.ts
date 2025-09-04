import { AddRoleTagInput, RoleTag } from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { RoleTagModel, roleTags } from './schema';

export class RoleTagRepository extends PivotRepository<RoleTagModel, RoleTag> {
  protected table = roleTags;
  protected parentIdField: keyof RoleTagModel = 'roleId';
  protected relatedIdField: keyof RoleTagModel = 'tagId';

  protected toEntity(dbPivot: RoleTagModel): RoleTag {
    return {
      id: dbPivot.id,
      roleId: dbPivot.roleId,
      tagId: dbPivot.tagId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getRoleTags(
    params: { roleId: string },
    transaction?: Transaction
  ): Promise<RoleTag[]> {
    return this.query({ parentId: params.roleId }, transaction);
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
    return this.add(
      {
        parentId: params.roleId,
        relatedId: params.tagId,
      },
      transaction
    );
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
