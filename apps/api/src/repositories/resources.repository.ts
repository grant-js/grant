import { DEFAULT_RESOURCE_ACTIONS } from '@grantjs/constants';
import type { IResourceRepository } from '@grantjs/core';
import { PermissionModel, permissions, ResourceModel, resources, tags } from '@grantjs/database';
import {
  CreateResourceInput,
  MutationDeleteResourceArgs,
  MutationUpdateResourceArgs,
  Permission,
  QueryResourcesArgs,
  Resource,
  ResourcePage,
  ResourceSearchableField,
  ResourceTag,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, FilterCondition, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

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
    permissions: {
      field: 'permissions',
      table: permissions,
      extract: (rows: PermissionModel[]) =>
        rows.map(
          (p) =>
            ({
              id: p.id,
              name: p.name,
              description: p.description,
              action: p.action,
              resourceId: p.resourceId,
              condition: p.condition as Permission['condition'],
              metadata: p.metadata as Permission['metadata'],
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              deletedAt: p.deletedAt,
            }) as Permission
        ),
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
    params: Omit<CreateResourceInput, 'scope' | 'createPermissions' | 'tagIds' | 'primaryTagId'> & {
      metadata?: Record<string, unknown>;
    },
    transaction?: Transaction
  ): Promise<Resource> {
    return this.create(
      {
        name: params.name,
        slug: params.slug,
        description: params.description,
        actions: params.actions ?? [...DEFAULT_RESOURCE_ACTIONS],
        isActive: params.isActive ?? true,
        metadata: params.metadata ?? {},
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
