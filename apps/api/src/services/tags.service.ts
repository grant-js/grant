import { DbSchema } from '@logusgraphics/grant-database';
import { tagAuditLogs } from '@logusgraphics/grant-database';
import {
  Tag,
  TagPage,
  QueryTagsArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
  CreateTagInput,
} from '@logusgraphics/grant-schema';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from './common';
import {
  createTagInputSchema,
  deleteTagArgsSchema,
  queryTagsArgsSchema,
  tagSchema,
  updateTagArgsSchema,
} from './tags.schemas';

import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

export class TagService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(tagAuditLogs, 'tagId', user, db);
  }

  private async getTag(tagId: string, transaction?: Transaction): Promise<Tag> {
    const existingTags = await this.repositories.tagRepository.getTags(
      { ids: [tagId], limit: 1 },
      transaction
    );

    if (existingTags.tags.length === 0) {
      throw new Error('Tag not found');
    }

    return existingTags.tags[0];
  }

  public async getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: Transaction
  ): Promise<TagPage> {
    const context = 'TagService.getTags';
    validateInput(queryTagsArgsSchema, params, context);

    const result = await this.repositories.tagRepository.getTags(params, transaction);

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

    const tag = await this.repositories.tagRepository.createTag({ name, color }, transaction);

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

    await this.logCreate(tag.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(tagSchema), tag, context);
  }

  public async updateTag(params: MutationUpdateTagArgs, transaction?: Transaction): Promise<Tag> {
    const context = 'TagService.updateTag';
    const validatedParams = validateInput(updateTagArgsSchema, params, context);

    const { id, input } = validatedParams;

    const oldTag = await this.getTag(id, transaction);
    const updatedTag = await this.repositories.tagRepository.updateTag({ id, input }, transaction);

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

    await this.logUpdate(updatedTag.id, oldValues, newValues, metadata, transaction);

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
      ? await this.repositories.tagRepository.hardDeleteTag({ id }, transaction)
      : await this.repositories.tagRepository.softDeleteTag({ id }, transaction);

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
      await this.logHardDelete(deletedTag.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedTag.deletedAt,
      };
      await this.logSoftDelete(deletedTag.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(tagSchema), deletedTag, context);
  }
}
