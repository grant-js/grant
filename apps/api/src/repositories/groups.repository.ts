import { GroupModel, groupPermissions, groupTags, groups } from '@grantjs/database';
import {
  CreateGroupInput,
  Group,
  GroupPage,
  GroupPermission,
  GroupSearchableField,
  GroupTag,
  MutationDeleteGroupArgs,
  QueryGroupsArgs,
  UpdateGroupInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';
import { EntityRepository, RelationsConfig } from '@/repositories/common';
import { SelectedFields } from '@/services/common';

export class GroupRepository extends EntityRepository<GroupModel, Group> {
  protected table = groups;
  protected schemaName = 'groups' as const;
  protected searchFields: Array<keyof GroupModel> = Object.values(GroupSearchableField);
  protected defaultSortField: keyof GroupModel = 'createdAt';
  protected relations: RelationsConfig<Group> = {
    tags: {
      field: 'tag',
      table: groupTags,
      extract: (v: GroupTag[]) => v.map(({ tag, isPrimary }) => ({ ...tag, isPrimary })),
    },
    permissions: {
      field: 'permission',
      table: groupPermissions,
      extract: (v: GroupPermission[]) => v.map(({ permission }) => permission),
    },
  };

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>,
    transaction?: Transaction
  ): Promise<GroupPage> {
    const result = await this.query(params, transaction);

    return {
      groups: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createGroup(
    params: Omit<CreateGroupInput, 'scope' | 'tagIds' | 'permissionIds'>,
    transaction?: Transaction
  ): Promise<Group> {
    return this.create(params, transaction);
  }

  public async updateGroup(
    id: string,
    input: UpdateGroupInput,
    transaction?: Transaction
  ): Promise<Group> {
    return this.update({ id, input }, transaction);
  }

  public async softDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Group> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Group> {
    return this.hardDelete(params, transaction);
  }
}
