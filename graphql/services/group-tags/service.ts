import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  MutationAddGroupTagArgs,
  MutationRemoveGroupTagArgs,
  GroupTag,
  QueryGroupTagsArgs,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { groupTagsAuditLogs } from '@/graphql/repositories/group-tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IGroupTagService } from './interface';
import {
  getGroupTagsParamsSchema,
  addGroupTagParamsSchema,
  removeGroupTagParamsSchema,
  groupTagSchema,
} from './schemas';

export class GroupTagService extends AuditService implements IGroupTagService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(groupTagsAuditLogs, 'groupTagId', user);
  }

  private async groupExists(groupId: string): Promise<void> {
    const groups = await this.repositories.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }
  }

  private async tagExists(tagId: string): Promise<void> {
    const tags = await this.repositories.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (tags.tags.length === 0) {
      throw new Error('Tag not found');
    }
  }

  private async groupHasTag(groupId: string, tagId: string): Promise<boolean> {
    await this.groupExists(groupId);
    await this.tagExists(tagId);
    const existingGroupTags = await this.repositories.groupTagRepository.getGroupTags({
      groupId,
    });

    return existingGroupTags.some((gt) => gt.tagId === tagId);
  }

  public async getGroupTags(params: Omit<QueryGroupTagsArgs, 'scope'>): Promise<GroupTag[]> {
    const validatedParams = validateInput(getGroupTagsParamsSchema, params, 'getGroupTags method');

    if (!validatedParams.groupId) {
      throw new Error('Group ID is required');
    }
    await this.groupExists(validatedParams.groupId);

    const result = await this.repositories.groupTagRepository.getGroupTags(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(groupTagSchema).array(),
      result,
      'getGroupTags method'
    );
  }

  public async addGroupTag(params: MutationAddGroupTagArgs): Promise<GroupTag> {
    const validatedParams = validateInput(addGroupTagParamsSchema, params, 'addGroupTag method');

    const hasTag = await this.groupHasTag(
      validatedParams.input.groupId,
      validatedParams.input.tagId
    );

    if (hasTag) {
      throw new Error('Group already has this tag');
    }

    const result = await this.repositories.groupTagRepository.addGroupTag(
      validatedParams.input.groupId,
      validatedParams.input.tagId
    );

    const newValues = {
      id: result.id,
      groupId: result.groupId,
      tagId: result.tagId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };

    const metadata = {
      source: 'add_group_tag_mutation',
    };

    await this.logCreate(result.id, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(groupTagSchema), result, 'addGroupTag method');
  }

  public async removeGroupTag(
    params: MutationRemoveGroupTagArgs & { hardDelete?: boolean }
  ): Promise<GroupTag> {
    const validatedParams = validateInput(
      removeGroupTagParamsSchema,
      params,
      'removeGroupTag method'
    );

    const hasTag = await this.groupHasTag(
      validatedParams.input.groupId,
      validatedParams.input.tagId
    );

    if (!hasTag) {
      throw new Error('Group does not have this tag');
    }

    const isHardDelete = params.hardDelete === true;

    const result = isHardDelete
      ? await this.repositories.groupTagRepository.hardDeleteGroupTag(
          validatedParams.input.groupId,
          validatedParams.input.tagId
        )
      : await this.repositories.groupTagRepository.softDeleteGroupTag(
          validatedParams.input.groupId,
          validatedParams.input.tagId
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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_group_tag_mutation',
      };
      await this.logHardDelete(result.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_group_tag_mutation',
      };
      await this.logSoftDelete(result.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(groupTagSchema),
      result,
      'removeGroupTag method'
    );
  }
}
