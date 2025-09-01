import {
  Role,
  QueryRolesArgs,
  RolePage,
  MutationCreateRoleArgs,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseQueryArgs,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { RoleModel, roles } from './schema';

export class RoleRepository extends EntityRepository<RoleModel, Role> {
  protected table = roles;
  protected schemaName = 'roles' as const;
  protected searchFields: Array<keyof RoleModel> = ['name', 'description'];
  protected defaultSortField: keyof RoleModel = 'createdAt';

  public async getRoles(
    params: Omit<QueryRolesArgs, 'scope'> & { requestedFields?: Array<keyof RoleModel> }
  ): Promise<RolePage> {
    const baseParams: BaseQueryArgs<RoleModel> = {
      ids: params.ids || undefined,
      page: params.page || undefined,
      limit: params.limit || undefined,
      search: params.search || undefined,
      sort: params.sort
        ? {
            field: params.sort.field as keyof RoleModel,
            order: params.sort.order,
          }
        : undefined,
      requestedFields: params.requestedFields as Array<keyof RoleModel> | undefined,
    };

    const result = await this.query(baseParams);

    return {
      roles: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createRole(params: MutationCreateRoleArgs): Promise<Role> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      description: params.input.description,
    };

    return this.create(baseParams);
  }

  public async updateRole(params: MutationUpdateRoleArgs): Promise<Role> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        description: params.input.description,
      },
    };

    return this.update(baseParams);
  }

  public async softDeleteRole(params: MutationDeleteRoleArgs): Promise<Role> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeleteRole(params: MutationDeleteRoleArgs): Promise<Role> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
