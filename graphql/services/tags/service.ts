import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  Tag,
  TagPage,
  QueryTagsArgs,
  MutationCreateTagArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
} from '@/graphql/generated/types';
import { Repositories } from '@/graphql/repositories';
import { tagAuditLogs } from '@/graphql/repositories/tags/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from '../common';

import { ITagService } from './interface';
import {
  getTagsParamsSchema,
  createTagParamsSchema,
  updateTagParamsSchema,
  deleteTagParamsSchema,
  tagSchema,
} from './schemas';

export class TagService extends AuditService implements ITagService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    private readonly db: PostgresJsDatabase
  ) {
    super(tagAuditLogs, 'tagId', user);
  }

  private async getTag(tagId: string): Promise<Tag> {
    const existingTags = await this.repositories.tagRepository.getTags({
      ids: [tagId],
      limit: 1,
    });

    if (existingTags.tags.length === 0) {
      throw new Error('Tag not found');
    }

    return existingTags.tags[0];
  }

  public async getTags(
    params: Omit<QueryTagsArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<TagPage> {
    const validatedParams = validateInput(getTagsParamsSchema, params, 'getTags method');
    const result = await this.repositories.tagRepository.getTags(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.tags,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      createDynamicPaginatedSchema(tagSchema, params.requestedFields),
      transformedResult,
      'getTags method'
    ) as any;

    return {
      tags: validatedResult.items,
      hasNextPage: validatedResult.hasNextPage,
      totalCount: validatedResult.totalCount,
    };
  }

  public async createTag(params: MutationCreateTagArgs): Promise<Tag> {
    const validatedParams = validateInput(createTagParamsSchema, params, 'createTag method');
    const tag = await this.repositories.tagRepository.createTag(validatedParams);

    const newValues = {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };

    const metadata = {
      source: 'create_tag_mutation',
    };

    await this.logCreate(tag.id, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(tagSchema), tag, 'createTag method');
  }

  public async updateTag(params: MutationUpdateTagArgs): Promise<Tag> {
    const validatedParams = validateInput(updateTagParamsSchema, params, 'updateTag method');

    const oldTag = await this.getTag(validatedParams.id);
    const updatedTag = await this.repositories.tagRepository.updateTag(validatedParams);

    const oldValues = {
      id: oldTag.id,
      name: oldTag.name,
      color: oldTag.color,
      createdAt: oldTag.createdAt,
      updatedAt: oldTag.updatedAt,
    };

    const newValues = {
      id: updatedTag.id,
      name: updatedTag.name,
      color: updatedTag.color,
      createdAt: updatedTag.createdAt,
      updatedAt: updatedTag.updatedAt,
    };

    const metadata = {
      source: 'update_tag_mutation',
    };

    await this.logUpdate(updatedTag.id, oldValues, newValues, metadata);

    return validateOutput(createDynamicSingleSchema(tagSchema), updatedTag, 'updateTag method');
  }

  public async deleteTag(params: MutationDeleteTagArgs & { hardDelete?: boolean }): Promise<Tag> {
    const validatedParams = validateInput(deleteTagParamsSchema, params, 'deleteTag method');

    const oldTag = await this.getTag(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedTag = isHardDelete
      ? await this.repositories.tagRepository.hardDeleteTag(validatedParams)
      : await this.repositories.tagRepository.softDeleteTag(validatedParams);

    const oldValues = {
      id: oldTag.id,
      name: oldTag.name,
      color: oldTag.color,
      createdAt: oldTag.createdAt,
      updatedAt: oldTag.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_tag_mutation',
      };
      await this.logHardDelete(deletedTag.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedTag.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_tag_mutation',
      };
      await this.logSoftDelete(deletedTag.id, oldValues, newValues, metadata);
    }

    return validateOutput(createDynamicSingleSchema(tagSchema), deletedTag, 'deleteTag method');
  }
}
