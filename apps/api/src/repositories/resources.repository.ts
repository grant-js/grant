import { DEFAULT_RESOURCE_ACTIONS } from '@grantjs/constants';
import { ResourceModel, resources, tags } from '@grantjs/database';
import {
  CreateResourceInput,
  MutationDeleteResourceArgs,
  MutationUpdateResourceArgs,
  QueryResourcesArgs,
  Resource,
  ResourcePage,
  ResourceSearchableField,
  ResourceTag,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, FilterCondition, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

import type { IResourceRepository } from '@grantjs/core';

export class ResourceRepository
  extends EntityRepository<ResourceModel, Resource>
  implements IResourceRepository
{
  protected table = resources;
  protected schemaName = 'resources' as const;
  protected searchFields: Array<keyof ResourceModel> = Object.values(ResourceSearchableField);
  protected defaultSortField: keyof ResourceModel = 'createdAt';
  protected relations: RelationsConfig<Resource> = {
    tags: {
      field: 'tag',
      table: tags,
      extract: (v: Array<ResourceTag>) =>
        v.map(({ tag, isPrimary }: ResourceTag) => ({ ...tag, isPrimary })),
    },
  };

  public async getResources(
    params: Omit<QueryResourcesArgs, 'scope' | 'tagIds'> & SelectedFields<Resource>,
    transaction?: Transaction
  ): Promise<ResourcePage> {
    const result = await this.query(params, transaction);

    return {
      resources: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createResource(
    params: Omit<CreateResourceInput, 'scope'>,
    transaction?: Transaction
  ): Promise<Resource> {
    return this.create(
      {
        ...params,
        actions: params.actions ?? [...DEFAULT_RESOURCE_ACTIONS],
        isActive: params.isActive ?? true,
      },
      transaction
    );
  }

  public async updateResource(
    params: MutationUpdateResourceArgs,
    transaction?: Transaction
  ): Promise<Resource> {
    return this.update(params, transaction);
  }

  public async softDeleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Resource> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteResource(
    params: Omit<MutationDeleteResourceArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Resource> {
    return this.hardDelete(params, transaction);
  }

  public async findResourceBySlug(
    slug: string,
    resourceIds: string[],
    transaction?: Transaction
  ): Promise<Resource | null> {
    if (resourceIds.length === 0) {
      return null;
    }

    const filters: FilterCondition<ResourceModel>[] = [
      {
        field: 'slug',
        operator: 'eq',
        value: slug,
      },
    ];

    const result = await this.query(
      {
        ids: resourceIds,
        filters,
        limit: 1,
      },
      transaction
    );

    return this.first(result.items) || null;
  }
}
