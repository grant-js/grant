import { AddUserTagInput, RemoveUserTagInput, UserTag } from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  PivotRepository,
  BasePivotQueryArgs,
  BasePivotAddArgs,
  BasePivotRemoveArgs,
} from '@/graphql/repositories/common';

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
      createdAt: dbUserTag.createdAt,
      updatedAt: dbUserTag.updatedAt,
      deletedAt: dbUserTag.deletedAt,
    };
  }

  public async getUserTags(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<UserTag[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.userId,
    };

    return this.query(baseParams, transaction);
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
    const baseParams: BasePivotAddArgs = {
      parentId: params.userId,
      relatedId: params.tagId,
    };

    const userTag = await this.add(baseParams, transaction);

    return userTag;
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
