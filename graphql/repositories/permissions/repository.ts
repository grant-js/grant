import {
  QueryPermissionsArgs,
  MutationCreatePermissionArgs,
  MutationUpdatePermissionArgs,
  MutationDeletePermissionArgs,
  Permission,
  PermissionPage,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseQueryArgs,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { PermissionModel, permissions } from './schema';

export class PermissionRepository extends EntityRepository<PermissionModel, Permission> {
  protected table = permissions;
  protected schemaName = 'permissions' as const;
  protected searchFields: Array<keyof PermissionModel> = ['name', 'description', 'action'];
  protected defaultSortField: keyof PermissionModel = 'createdAt';

  public async getPermissions(
    params: Omit<QueryPermissionsArgs, 'scope'> & { requestedFields?: Array<keyof PermissionModel> }
  ): Promise<PermissionPage> {
    const baseParams: BaseQueryArgs<PermissionModel> = {
      ids: params.ids || undefined,
      page: params.page || undefined,
      limit: params.limit || undefined,
      search: params.search || undefined,
      sort: params.sort
        ? {
            field: params.sort.field as keyof PermissionModel,
            order: params.sort.order,
          }
        : undefined,
      requestedFields: params.requestedFields as Array<keyof PermissionModel> | undefined,
    };

    const result = await this.query(baseParams);

    return {
      permissions: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createPermission(params: MutationCreatePermissionArgs): Promise<Permission> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      description: params.input.description,
      action: params.input.action,
    };

    return this.create(baseParams);
  }

  public async updatePermission(params: MutationUpdatePermissionArgs): Promise<Permission> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        description: params.input.description,
        action: params.input.action,
      },
    };

    return this.update(baseParams);
  }

  public async softDeletePermission(params: MutationDeletePermissionArgs): Promise<Permission> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeletePermission(params: MutationDeletePermissionArgs): Promise<Permission> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
