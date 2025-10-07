import { GroupTag, groupTags } from '@logusgraphics/grant-database';
import { AddGroupTagInput, UpdateGroupTagInput } from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';

import { PivotRepository, BasePivotRemoveArgs } from '../common/PivotRepository';

export class GroupTagRepository extends PivotRepository<GroupTag, GroupTag> {
  protected table = groupTags;
  protected parentIdField: keyof GroupTag = 'groupId';
  protected relatedIdField: keyof GroupTag = 'tagId';

  protected toEntity(dbGroupTag: GroupTag): GroupTag {
    return dbGroupTag;
  }

  public async getGroupTags(
    params: { groupId?: string; tagId?: string },
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    return this.query({ parentId: params.groupId, relatedId: params.tagId }, transaction);
  }

  public async getGroupTag(
    params: { groupId: string; tagId: string },
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
    return this.queryIntersection({ parentIds: groupIds, relatedIds: tagIds }, transaction);
  }

  public async addGroupTag(params: AddGroupTagInput, transaction?: Transaction): Promise<GroupTag> {
    const { groupId, tagId, isPrimary } = params;

    const groupTag = await this.add(
      { parentId: groupId, relatedId: tagId, isPrimary },
      transaction
    );
    return groupTag;
  }

  public async updateGroupTag(
    params: UpdateGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const { groupId, tagId, isPrimary } = params;
    return this.update(groupId, tagId, { isPrimary }, transaction);
  }

  public async softDeleteGroupTag(
    params: { groupId: string; tagId: string },
    transaction?: Transaction
  ): Promise<GroupTag | null> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.groupId,
      relatedId: params.tagId,
    };

    const groupTag = await this.softDelete(baseParams, transaction);
    return groupTag;
  }

  public async hardDeleteGroupTag(
    params: { groupId: string; tagId: string },
    transaction?: Transaction
  ): Promise<GroupTag | null> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.groupId,
      relatedId: params.tagId,
    };

    const groupTag = await this.hardDelete(baseParams, transaction);
    return groupTag;
  }
}
