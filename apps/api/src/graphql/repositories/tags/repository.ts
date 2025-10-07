import { TagModel, tags } from '@logusgraphics/grant-database';
import {
  QueryTagsArgs,
  MutationDeleteTagArgs,
  Tag,
  TagPage,
  CreateTagInput,
  MutationUpdateTagArgs,
  TagSearchableField,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  EntityRepository,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
  RelationsConfig,
} from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';

export class TagRepository extends EntityRepository<TagModel, Tag> {
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
    params: Omit<MutationUpdateTagArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Tag> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        color: params.input.color,
      },
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
