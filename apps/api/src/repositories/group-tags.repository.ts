import { GroupTagModel, groupTags } from '@grantjs/database';
import {
  AddGroupTagInput,
  GroupTag,
  QueryGroupTagsInput,
  RemoveGroupTagInput,
  UpdateGroupTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class GroupTagRepository extends PivotRepository<GroupTagModel, GroupTag> {
  protected table = groupTags;
  protected uniqueIndexFields: Array<keyof GroupTagModel> = ['groupId', 'tagId'];

  protected toEntity(dbGroupTag: GroupTagModel): GroupTag {
    return dbGroupTag;
  }

  public async getGroupTags(
    params: QueryGroupTagsInput,
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    return this.query(params, transaction);
  }

  public async getGroupTag(
    params: QueryGroupTagsInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const result = await this.getGroupTags(params, transaction);
    return this.first(result);
  }

  public async getGroupTagIntersection(
    groupIds: string[],
    tagIds: string[],
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    return this.queryIntersection({ groupId: groupIds, tagId: tagIds }, transaction);
  }

  public async addGroupTag(params: AddGroupTagInput, transaction?: Transaction): Promise<GroupTag> {
    return this.add(params, transaction);
  }

  public async updateGroupTag(
    params: UpdateGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const { groupId, tagId, isPrimary } = params;
    return this.update({ groupId, tagId }, { isPrimary }, transaction);
  }

  public async softDeleteGroupTag(
    params: RemoveGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteGroupTag(
    params: RemoveGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    return this.hardDelete(params, transaction);
  }
}
