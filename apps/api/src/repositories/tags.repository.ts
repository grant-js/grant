import { TagModel, tags } from '@grantjs/database';
import {
  QueryTagsArgs,
  MutationDeleteTagArgs,
  Tag,
  TagPage,
  CreateTagInput,
  TagSearchableField,
  UpdateTagInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  EntityRepository,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
  RelationsConfig,
} from '@/repositories/common';
import { SelectedFields } from '@/types';

import type { ITagRepository } from '@grantjs/core';

export class TagRepository extends EntityRepository<TagModel, Tag> implements ITagRepository {
  protected table = tags;
  protected schemaName = 'tags' as const;
  protected searchFields: Array<keyof TagModel> = Object.values(TagSearchableField);
  protected defaultSortField: keyof TagModel = 'createdAt';
  protected relations: RelationsConfig<Tag> = {};

  public async getTags(
    params: Omit<QueryTagsArgs, 'scope'> & SelectedFields<Tag>,
    transaction?: Transaction
  ): Promise<TagPage> {
    const result = await this.query(params, transaction);

    return {
      tags: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createTag(
    params: Omit<CreateTagInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Tag> {
    const baseParams: BaseCreateArgs = {
      name: params.name,
      color: params.color,
    };

    return this.create(baseParams, transaction);
  }

  public async updateTag(
    id: string,
    input: UpdateTagInput,
    transaction?: Transaction
  ): Promise<Tag> {
    const baseParams: BaseUpdateArgs = {
      id,
      input,
    };

    return this.update(baseParams, transaction);
  }

  public async softDeleteTag(
    params: Omit<MutationDeleteTagArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Tag> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteTag(
    params: Omit<MutationDeleteTagArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Tag> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
