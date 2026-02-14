import {
  AddGroupTagInput,
  GroupTag,
  RemoveGroupTagInput,
  UpdateGroupTagInput,
} from '@grantjs/schema';

import { BadRequestError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addGroupTagInputSchema,
  getGroupTagIntersectionInputSchema,
  groupTagSchema,
  queryGroupTagsArgsSchema,
  removeGroupTagInputSchema,
  removeGroupTagsInputSchema,
  updateGroupTagInputSchema,
} from './group-tags.schemas';

import type {
  IAuditLogger,
  IGroupRepository,
  IGroupTagRepository,
  IGroupTagService,
  ITagRepository,
} from '@grantjs/core';

export class GroupTagService implements IGroupTagService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly tagRepository: ITagRepository,
    private readonly groupTagRepository: IGroupTagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
    }
  }

  private async tagExists(tagId: string, transaction?: Transaction): Promise<void> {
    const tags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (tags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }
  }

  private async groupHasTag(
    groupId: string,
    tagId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.groupExists(groupId, transaction);
    await this.tagExists(tagId, transaction);
    const existingGroupTags = await this.groupTagRepository.getGroupTags({ groupId }, transaction);

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
      throw new ValidationError('Group ID is required');
    }
    await this.groupExists(groupId, transaction);

    const result = await this.groupTagRepository.getGroupTags({ groupId }, transaction);
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

    const result = await this.groupTagRepository.getGroupTagIntersection(
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
      throw new ConflictError('Group already has this tag', 'GroupTag', 'tagId');
    }

    const result = await this.groupTagRepository.addGroupTag(
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

    await this.audit.logCreate(result.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupTagSchema), result, context);
  }

  public async updateGroupTag(
    params: UpdateGroupTagInput,
    transaction?: Transaction
  ): Promise<GroupTag> {
    const context = 'GroupTagService.updateGroupTag';
    const validatedParams = validateInput(updateGroupTagInputSchema, params, context);
    const { groupId, tagId, isPrimary } = validatedParams;

    const groupTag = await this.groupTagRepository.getGroupTag({ groupId, tagId }, transaction);

    const updatedGroupTag = await this.groupTagRepository.updateGroupTag(
      { groupId, tagId, isPrimary },
      transaction
    );

    const metadata = {
      context,
    };

    await this.audit.logUpdate(
      updatedGroupTag.id,
      groupTag,
      updatedGroupTag,
      metadata,
      transaction
    );

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
      throw new NotFoundError('Tag');
    }

    const isHardDelete = hardDelete === true;

    const result = isHardDelete
      ? await this.groupTagRepository.hardDeleteGroupTag({ groupId, tagId }, transaction)
      : await this.groupTagRepository.softDeleteGroupTag({ groupId, tagId }, transaction);

    if (!result) {
      throw new BadRequestError('Failed to remove group tag');
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
      await this.audit.logHardDelete(result.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(result.id, oldValues, newValues, metadata, transaction);
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

    const groupTags = await this.groupTagRepository.getGroupTags({ tagId }, transaction);

    const isHardDelete = hardDelete === true;

    const deletedGroupTags = await Promise.all(
      groupTags.map((groupTag) =>
        isHardDelete
          ? this.groupTagRepository.hardDeleteGroupTag(groupTag, transaction)
          : this.groupTagRepository.softDeleteGroupTag(groupTag, transaction)
      )
    );

    return validateOutput(
      createDynamicSingleSchema(groupTagSchema).array(),
      deletedGroupTags,
      context
    );
  }
}
