import { UserTagModel, userTags } from '@logusgraphics/grant-database';
import {
  AddUserTagInput,
  QueryUserTagsInput,
  RemoveUserTagInput,
  UpdateUserTagInput,
  UserTag,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { PivotRepository } from '@/repositories/common';

export class UserTagRepository extends PivotRepository<UserTagModel, UserTag> {
  protected table = userTags;
  protected uniqueIndexFields: Array<keyof UserTagModel> = ['userId', 'tagId'];

  protected toEntity(dbUserTag: UserTagModel): UserTag {
    return dbUserTag;
  }

  public async getUserTags(
    params: QueryUserTagsInput,
    transaction?: Transaction
  ): Promise<UserTag[]> {
    return this.query(params, transaction);
  }

  public async getUserTag(params: QueryUserTagsInput, transaction?: Transaction): Promise<UserTag> {
    const result = await this.getUserTags(params, transaction);
    return this.first(result);
  }

  public async getUserTagIntersection(
    userIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<UserTag[]> {
    return this.queryIntersection({ userId: userIds, tagId: tagIds }, transaction);
  }

  public async addUserTag(params: AddUserTagInput, transaction?: Transaction): Promise<UserTag> {
    return this.add(params, transaction);
  }

  public async updateUserTag(
    params: UpdateUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    const { userId, tagId, isPrimary } = params;
    return this.update({ userId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteUserTag(
    params: RemoveUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteUserTag(
    params: RemoveUserTagInput,
    transaction?: Transaction
  ): Promise<UserTag> {
    return this.hardDelete(params, transaction);
  }
}
