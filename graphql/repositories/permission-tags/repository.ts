import {
  AddPermissionTagInput,
  PermissionTag,
  RemovePermissionTagInput,
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
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt,
    };
  }

  public async getPermissionTags(
    params: { permissionId: string },
    transaction?: Transaction
  ): Promise<PermissionTag[]> {
    return this.query({ parentId: params.permissionId }, transaction);
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
    return this.add(
      {
        parentId: params.permissionId,
        relatedId: params.tagId,
      },
      transaction
    );
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
