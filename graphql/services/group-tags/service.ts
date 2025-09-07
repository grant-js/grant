import {
  AddGroupTagInput,
  GroupTag,
  RemoveGroupTagInput,
  UpdateGroupTagInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { groupTagsAuditLogs } from '@/graphql/repositories/group-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  addGroupTagInputSchema,
  getGroupTagIntersectionInputSchema,
  groupTagSchema,
  queryGroupTagsArgsSchema,
  removeGroupTagInputSchema,
  removeGroupTagsInputSchema,
  updateGroupTagInputSchema,
} from './schemas';

export class GroupTagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(groupTagsAuditLogs, 'groupTagId', user, db);
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags(
      { ids: [tagId], limit: 1 },
      transaction
    );

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async groupHasTag(
    groupId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.groupExists(groupId, transaction);
    await this.tagExists(tagId, transaction);
    const existingGroupTags = await this.repositories.groupTagRepository.getGroupTags(
      { groupId },
      transaction
    );

    return existingGroupTags.some((gt) => gt.tagId === tagId);
  }

  public async getGroupTags(
    params: { groupId: string },
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    const context = 'GroupTagService.getGroupTags';
    const validatedParams = validateInput(queryGroupTagsArgsSchema, params, context);
    const { groupId } = validatedParams;

    if (!groupId) {
      throw new Error('Group ID is required');
    }
    await this.groupExists(groupId, transaction);

    const result = await this.repositories.groupTagRepository.getGroupTags(
      { groupId },
      transaction
    );
    return validateOutput(createDynamicSingleSchema(groupTagSchema).array(), result, context);
  }

  public async getGroupTagIntersection(
    params: {
      groupIds: string[];
      tagIds: string[];
    },
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    const context = 'GroupTagService.getGroupTagIntersection';
    const validatedParams = validateInput(getGroupTagIntersectionInputSchema, params, context);
    const { groupIds, tagIds } = validatedParams;

    const result = await this.repositories.groupTagRepository.getGroupTagIntersection(
      groupIds,
      tagIds,
      transaction
    );
    return validateOutput(createDynamicSingleSchema(groupTagSchema).array(), result, context);
  }

  public async addGroupTag(params: AddGroupTagInput, transaction?: Transaction): Promise<GroupTag> {
    const context = 'GroupTagService.addGroupTag';
    const validatedParams = validateInput(addGroupTagInputSchema, params, context);
    const { groupId, tagId, isPrimary } = validatedParams;

    const hasTag = await this.groupHasTag(groupId, tagId, transaction);

    if (hasTag) {
      throw new Error('Group already has this tag');
    }

    const result = await this.repositories.groupTagRepository.addGroupTag(
      { groupId, tagId, isPrimary },
      transaction
    );

    const newValues = {
      id: result.id,
      groupId: result.groupId,
      tagId: result.tagId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(result.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupTagSchema), result, context);
  }

  public async updateGroupTag(
    params: UpdateGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const context = 'GroupTagService.updateGroupTag';
    const validatedParams = validateInput(updateGroupTagInputSchema, params, context);
    const { groupId, tagId, isPrimary } = validatedParams;

    const groupTag = await this.repositories.groupTagRepository.getGroupTag(
      { groupId, tagId },
      transaction
    );

    const updatedGroupTag = await this.repositories.groupTagRepository.updateGroupTag(
      { groupId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.logUpdate(updatedGroupTag.id, groupTag, updatedGroupTag, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupTagSchema), updatedGroupTag, context);
  }

  public async removeGroupTag(
    params: RemoveGroupTagInput & DeleteParams,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const context = 'GroupTagService.removeGroupTag';
    const validatedParams = validateInput(removeGroupTagInputSchema, params, context);
    const { groupId, tagId, hardDelete } = validatedParams;

    const hasTag = await this.groupHasTag(groupId, tagId, transaction);

    if (!hasTag) {
      throw new Error('Group does not have this tag');
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.repositories.groupTagRepository.hardDeleteGroupTag(
          { groupId, tagId },
          transaction
        )
      : await this.repositories.groupTagRepository.softDeleteGroupTag(
          { groupId, tagId },
          transaction
        );

    if (!result) {
      throw new Error('Failed to remove group tag');
    }

    const oldValues = {
      id: result.id,
      groupId: result.groupId,
      tagId: result.tagId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: result.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(groupTagSchema), result, context);
  }

  public async removeGroupTags(
    params: { tagId: string } & DeleteParams,
    transaction?: Transaction
  ): Promise<GroupTag[]> {
    const context = 'GroupTagService.removeGroupTags';
    const validatedParams = validateInput(removeGroupTagsInputSchema, params, context);
    const { tagId, hardDelete } = validatedParams;

    const groupTags = await this.repositories.groupTagRepository.getGroupTags(
      { tagId },
      transaction
    );

    const isHardDelete = hardDelete === true;

    const deletedGroupTags = await Promise.all(
      groupTags.map((groupTag) =>
        isHardDelete
          ? this.repositories.groupTagRepository.hardDeleteGroupTag(groupTag, transaction)
          : this.repositories.groupTagRepository.softDeleteGroupTag(groupTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(groupTagSchema).array(),
      deletedGroupTags,
      context
    );
  }
}
