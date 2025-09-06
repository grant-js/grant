import {
  AddUserTagInput,
  RemoveUserTagInput,
  UpdateUserTagInput,
  UserTag,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { PivotRepository, BasePivotRemoveArgs } from '@/graphql/repositories/common';

import { userTags, UserTagModel } from './schema';

export class UserTagRepository extends PivotRepository<UserTagModel, UserTag> {
  protected table = userTags;
  protected parentIdField: keyof UserTagModel = 'userId';
  protected relatedIdField: keyof UserTagModel = 'tagId';

  protected toEntity(dbUserTag: UserTagModel): UserTag {
    return {
      id: dbUserTag.id,
      userId: dbUserTag.userId,
      tagId: dbUserTag.tagId,
      isPrimary: dbUserTag.isPrimary,
      createdAt: dbUserTag.createdAt,
      updatedAt: dbUserTag.updatedAt,
      deletedAt: dbUserTag.deletedAt,
    };
  }

  public async getUserTags(
    params: { userId?: string; tagId?: string },
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const { userId, tagId } = params;
    return this.query({ parentId: userId, relatedId: tagId }, transaction);
  }

  public async getUserTag(
    params: { userId: string; tagId: string },
    transaction?: Transaction
  ): Promise<UserTag> {
    const result = await this.getUserTags(params, transaction);
    return this.first(result);
  }

  public async getUserTagIntersection(
    params: {
      userIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<UserTag[]> {
    return this.queryIntersection(
      { parentIds: params.userIds, relatedIds: params.tagIds },
      transaction
    );
  }

  public async addUserTag(params: AddUserTagInput, transaction?: Transaction): Promise<UserTag> {
    const { userId, tagId, ...rest } = params;
    return this.add({ parentId: userId, relatedId: tagId, ...rest }, transaction);
  }

  public async updateUserTag(
    params: UpdateUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const { userId, tagId, isPrimary } = params;
    return this.update(userId, tagId, { isPrimary }, transaction);
  }

  public async softDeleteUserTag(
    params: RemoveUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.userId,
      relatedId: params.tagId,
    };

    const userTag = await this.softDelete(baseParams, transaction);

    return userTag;
  }

  public async hardDeleteUserTag(
    params: RemoveUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.userId,
      relatedId: params.tagId,
    };

    const userTag = await this.hardDelete(baseParams, transaction);

    return userTag;
  }
}
