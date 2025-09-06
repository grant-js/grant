import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
  UpdatePermissionTagInput,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository } from '@/graphql/repositories/common';

import { PermissionTagModel, permissionTags } from './schema';

export class PermissionTagRepository extends PivotRepository<PermissionTagModel, PermissionTag> {
  protected table = permissionTags;
  protected parentIdField: keyof PermissionTagModel = 'permissionId';
  protected relatedIdField: keyof PermissionTagModel = 'tagId';

  protected toEntity(dbPivot: PermissionTagModel): PermissionTag {
    return {
      id: dbPivot.id,
      permissionId: dbPivot.permissionId,
      tagId: dbPivot.tagId,
      isPrimary: dbPivot.isPrimary,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getPermissionTags(
    params: { permissionId?: string; tagId?: string },
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    return this.query({ parentId: params.permissionId, relatedId: params.tagId }, transaction);
  }

  public async getPermissionTag(
    params: { permissionId: string; tagId: string },
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const result = await this.getPermissionTags(params, transaction);
    return this.first(result);
  }

  public async getPermissionTagIntersection(
    params: {
      permissionIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    return this.queryIntersection(
      { parentIds: params.permissionIds, relatedIds: params.tagIds },
      transaction
    );
  }

  public async addPermissionTag(
    params: AddPermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const { permissionId, tagId, isPrimary } = params;
    return this.add({ parentId: permissionId, relatedId: tagId, isPrimary }, transaction);
  }

  public async updatePermissionTag(
    params: UpdatePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    const { permissionId, tagId, isPrimary } = params;
    return this.update(permissionId, tagId, { isPrimary }, transaction);
  }

  public async softDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    return this.softDelete(
      {
        parentId: params.permissionId,
        relatedId: params.tagId,
      },
      transaction
    );
  }

  public async hardDeletePermissionTag(
    params: RemovePermissionTagInput,
    transaction?: Transaction
  ): Promise<PermissionTag> {
    return this.hardDelete(
      {
        parentId: params.permissionId,
        relatedId: params.tagId,
      },
      transaction
    );
  }
}
