import { tags } from '@logusgraphics/grant-database';
import { PermissionModel, permissions } from '@logusgraphics/grant-database';
import {
  QueryPermissionsArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
  PermissionTag,
  CreatePermissionInput,
  PermissionSearchableField,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  EntityRepository,
  BaseUpdateArgs,
  BaseDeleteArgs,
  RelationsConfig,
} from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';

export class PermissionRepository extends EntityRepository<PermissionModel, Permission> {
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
  };

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope' | 'tagIds'> & SelectedFields<Permission>,
    transaction?: Transaction
  ): Promise<PermissionPage> {
    const result = await this.query(params, transaction);

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
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        description: params.input.description,
        action: params.input.action,
      },
    };

    return this.update(baseParams, transaction);
  }

  public async softDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Permission> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeletePermission(
    params: Omit<MutationDeletePermissionArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Permission> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
