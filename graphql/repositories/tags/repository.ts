import {
  QueryTagsArgs,
  MutationCreateTagArgs,
  MutationUpdateTagArgs,
  MutationDeleteTagArgs,
  Tag,
  TagPage,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseQueryArgs,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { TagModel, tags } from './schema';

export class TagRepository extends EntityRepository<TagModel, Tag> {
  protected table = tags;
  protected schemaName = 'tags' as const;
  protected searchFields: Array<keyof TagModel> = ['name'];
  protected defaultSortField: keyof TagModel = 'createdAt';

  public async getTags(
    params: Omit<QueryTagsArgs, 'scope'> & { requestedFields?: Array<keyof TagModel> }
  ): Promise<TagPage> {
    const baseParams: BaseQueryArgs<TagModel> = {
      ids: params.ids || undefined,
      page: params.page || undefined,
      limit: params.limit || undefined,
      search: params.search || undefined,
      sort: params.sort
        ? {
            field: params.sort.field as keyof TagModel,
            order: params.sort.order,
          }
        : undefined,
      requestedFields: params.requestedFields as Array<keyof TagModel> | undefined,
    };

    const result = await this.query(baseParams);

    return {
      tags: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createTag(params: MutationCreateTagArgs): Promise<Tag> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      color: params.input.color,
    };

    return this.create(baseParams);
  }

  public async updateTag(params: MutationUpdateTagArgs): Promise<Tag> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        color: params.input.color,
      },
    };

    return this.update(baseParams);
  }

  public async softDeleteTag(params: MutationDeleteTagArgs): Promise<Tag> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeleteTag(params: MutationDeleteTagArgs): Promise<Tag> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
