import { groups } from '@grantjs/database';
import { tags } from '@grantjs/database';
import { RoleModel, roles } from '@grantjs/database';
import {
  Role,
  QueryRolesArgs,
  RolePage,
  MutationDeleteRoleArgs,
  RoleTag,
  RoleGroup,
  CreateRoleInput,
  RoleSearchableField,
  UpdateRoleInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/types';

import type { IRoleRepository } from '@grantjs/core';

export class RoleRepository extends EntityRepository<RoleModel, Role> implements IRoleRepository {
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
    id: string,
    input: UpdateRoleInput,
    transaction?: Transaction
  ): Promise<Role> {
    return this.update({ id, input }, transaction);
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
