import {
  Tag,
  TagPage,
  QueryTagsArgs,
  MutationDeleteTagArgs,
  CreateTagInput,
  UpdateTagInput,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
} from './common';
import {
  createTagInputSchema,
  deleteTagArgsSchema,
  queryTagsArgsSchema,
  tagSchema,
  updateTagArgsSchema,
} from './tags.schemas';

import type { IAuditLogger, ITagRepository, ITagService } from '@grantjs/core';

export class TagService implements ITagService {
  constructor(
    private readonly tagRepository: ITagRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async getTag(tagId: string, transaction?: Transaction): Promise<Tag> {
    const existingTags = await this.tagRepository.getTags({ ids: [tagId], limit: 1 }, transaction);

    if (existingTags.tags.length === 0) {
      throw new NotFoundError('Tag');
    }

    return existingTags.tags[0];
  }

  public async getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: Transaction
  ): Promise<TagPage> {
    const context = 'TagService.getTags';
    validateInput(queryTagsArgsSchema, params, context);

    const result = await this.tagRepository.getTags(params, transaction);

    const transformedResult = {
      items: result.tags,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(tagSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createTag(
    params: Omit<CreateTagInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Tag> {
    const context = 'TagService.createTag';
    const validatedParams = validateInput(createTagInputSchema, params, context);

    const { name, color } = validatedParams;

    const tag = await this.tagRepository.createTag({ name, color }, transaction);

    const newValues = {
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(tag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(tagSchema), tag, context);
  }

  public async updateTag(
    id: string,
    input: UpdateTagInput,
    transaction?: Transaction
  ): Promise<Tag> {
    const context = 'TagService.updateTag';
    validateInput(updateTagArgsSchema, { id, input }, context);

    const oldTag = await this.getTag(id, transaction);
    const updatedTag = await this.tagRepository.updateTag(id, input, transaction);

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
      context,
    };

    await this.audit.logUpdate(updatedTag.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(tagSchema), updatedTag, context);
  }

  public async deleteTag(
    params: Omit<MutationDeleteTagArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Tag> {
    const context = 'TagService.deleteTag';
    const validatedParams = validateInput(deleteTagArgsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldTag = await this.getTag(id);
    const isHardDelete = hardDelete === true;

    const deletedTag = isHardDelete
      ? await this.tagRepository.hardDeleteTag({ id }, transaction)
      : await this.tagRepository.softDeleteTag({ id }, transaction);

    const oldValues = {
      id: oldTag.id,
      name: oldTag.name,
      color: oldTag.color,
      createdAt: oldTag.createdAt,
      updatedAt: oldTag.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(deletedTag.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedTag.deletedAt,
      };
      await this.audit.logSoftDelete(deletedTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(tagSchema), deletedTag, context);
  }
}
