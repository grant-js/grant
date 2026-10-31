import type { IPermissionRepository, OptionalListScope, PermissionRef } from '@grantjs/core';
import { PermissionModel, permissions, permissionTags, resources, tags } from '@grantjs/database';
import {
  CreatePermissionInput,
  MutationDeletePermissionArgs,
  MutationUpdatePermissionArgs,
  Permission,
  PermissionPage,
  PermissionSearchableField,
  PermissionTag,
  QueryPermissionsArgs,
  Resource,
} from '@grantjs/schema';
import { and, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';
import {
  anyTagExistsSql,
  EntityRepository,
  RelationsConfig,
  requireAccessibleIdSource,
} from '@/repositories/common';
import { SelectedFields } from '@/types';

export class PermissionRepository
  extends EntityRepository<PermissionModel, Permission>
  implements IPermissionRepository
{
  protected table = permissions;
  protected schemaName = 'permissions' as const;
  protected searchFields: Array<keyof PermissionModel> = Object.values(PermissionSearchableField);
  protected defaultSortField: keyof PermissionModel = 'createdAt';
  protected relations: RelationsConfig<Permission> = {
    tags: {
      field: 'tag',
      table: tags,
      extract: (v: Array<PermissionTag>) =>
        v.map(({ tag, isPrimary }: PermissionTag) => ({ ...tag, isPrimary })),
    },
    resource: {
      field: 'resource',
      table: resources,
      extract: (v: Resource) => v,
    },
  };

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope'> & OptionalListScope & SelectedFields<Permission>,
    transaction?: Transaction
  ): Promise<PermissionPage> {
    const extraConditions = [];
    let accessibleIdSource;
    if (params.scope) {
      accessibleIdSource = requireAccessibleIdSource('permissions', params.scope);
      if (params.tagIds?.length) {
        extraConditions.push(
          anyTagExistsSql(
            this.table.id,
            {
              table: permissionTags,
              ownerColumn: permissionTags.permissionId,
              tagColumn: permissionTags.tagId,
              deletedAt: permissionTags.deletedAt,
            },
            params.tagIds
          )
        );
      }
    }
    const result = await this.query(
      { ...params, accessibleIdSource, extraConditions },
      transaction
    );

    return {
      permissions: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createPermission(
    params: Omit<CreatePermissionInput, 'scope' | 'tagIds'>,
    transaction?: Transaction
  ): Promise<Permission> {
    return this.create(params, transaction);
  }

  public async updatePermission(
    params: MutationUpdatePermissionArgs,
    transaction?: Transaction
  ): Promise<Permission> {
    return this.update(params, transaction);
  }

  public async softDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Permission> {
    return this.softDelete(params, transaction);
  }

  public async hardDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Permission> {
    return this.hardDelete(params, transaction);
  }

  public async getPermissionsByResourceId(
    resourceId: string,
    transaction?: Transaction
  ): Promise<Permission[]> {
    const db = transaction || this.db;
    const result = await db
      .select()
      .from(permissions)
      .where(and(eq(permissions.resourceId, resourceId), isNull(permissions.deletedAt)));

    return result.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      action: p.action,
      resourceId: p.resourceId,
      condition: p.condition,
      metadata: p.metadata,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      deletedAt: p.deletedAt,
    })) as Permission[];
  }

  public async getPermissionRefsByIds(
    ids: readonly string[],
    transaction?: Transaction
  ): Promise<PermissionRef[]> {
    if (ids.length === 0) {
      return [];
    }
    const db = transaction || this.db;
    return db
      .select({ id: permissions.id, resource: resources.slug, action: permissions.action })
      .from(permissions)
      .innerJoin(
        resources,
        and(eq(permissions.resourceId, resources.id), isNull(resources.deletedAt))
      )
      .where(and(inArray(permissions.id, [...ids]), isNull(permissions.deletedAt)));
  }

  public async getPermissionRefsByActions(
    pairs: readonly { resource: string; action: string }[],
    transaction?: Transaction
  ): Promise<PermissionRef[]> {
    if (pairs.length === 0) {
      return [];
    }
    const db = transaction || this.db;
    return db
      .select({ id: permissions.id, resource: resources.slug, action: permissions.action })
      .from(permissions)
      .innerJoin(
        resources,
        and(eq(permissions.resourceId, resources.id), isNull(resources.deletedAt))
      )
      .where(
        and(
          isNull(permissions.deletedAt),
          or(
            ...pairs.map(
              (pair) =>
                sql`(lower(${resources.slug}) = ${pair.resource.trim().toLowerCase()} AND lower(${permissions.action}) = ${pair.action.trim().toLowerCase()})`
            )
          )
        )
      );
  }
}
