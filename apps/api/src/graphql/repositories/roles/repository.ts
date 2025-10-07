import { groups } from '@logusgraphics/grant-database';
import { tags } from '@logusgraphics/grant-database';
import { RoleModel, roles } from '@logusgraphics/grant-database';
import {
  Role,
  QueryRolesArgs,
  RolePage,
  MutationUpdateRoleArgs,
  MutationDeleteRoleArgs,
  RoleTag,
  RoleGroup,
  CreateRoleInput,
  RoleSearchableField,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { EntityRepository, RelationsConfig } from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';

export class RoleRepository extends EntityRepository<RoleModel, Role> {
  protected table = roles;
  protected schemaName = 'roles' as const;
  protected searchFields: Array<keyof RoleModel> = Object.values(RoleSearchableField);
  protected defaultSortField: keyof RoleModel = 'createdAt';
  protected relations: RelationsConfig<Role> = {
    tags: {
      field: 'tag',
      table: tags,
      extract: (v: Array<RoleTag>) =>
        v.map(({ tag, isPrimary }: RoleTag) => ({ ...tag, isPrimary })),
    },
    groups: {
      field: 'group',
      table: groups,
      extract: (v: Array<RoleGroup>) => v.map(({ group }: RoleGroup) => group),
    },
  };

  public async getRoles(
    params: Omit<QueryRolesArgs, 'scope' | 'tagIds'> & SelectedFields<Role>,
    transaction?: Transaction
  ): Promise<RolePage> {
    const result = await this.query(params, transaction);

    return {
      roles: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createRole(
    params: Omit<CreateRoleInput, 'scope' | 'tagIds' | 'groupIds'>,
    transaction?: Transaction
  ): Promise<Role> {
    return this.create(params, transaction);
  }

  public async updateRole(
    params: MutationUpdateRoleArgs,
    transaction?: Transaction
  ): Promise<Role> {
    return this.update(params, transaction);
  }

  public async softDeleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Role> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteRole(
    params: Omit<MutationDeleteRoleArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Role> {
    return this.hardDelete(params, transaction);
  }
}
