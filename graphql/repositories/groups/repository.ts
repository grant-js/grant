import {
  QueryGroupsArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
  GroupTag,
  GroupPermission,
  CreateGroupInput,
  GroupSearchableField,
} from '@/graphql/generated/types';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import {
  EntityRepository,
  RelationsConfig,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';
import { SelectedFields } from '@/graphql/services/common';

import { groupPermissions } from '../group-permissions/schema';
import { groupTags } from '../group-tags/schema';

import { GroupModel, groups } from './schema';

export class GroupRepository extends EntityRepository<GroupModel, Group> {
  protected table = groups;
  protected schemaName = 'groups' as const;
  protected searchFields: Array<keyof GroupModel> = Object.values(GroupSearchableField);
  protected defaultSortField: keyof GroupModel = 'createdAt';
  protected relations: RelationsConfig<Group> = {
    tags: {
      field: 'tag',
      table: groupTags,
      extract: (v: GroupTag[]) => v.map(({ tag }) => tag),
    },
    permissions: {
      field: 'permission',
      table: groupPermissions,
      extract: (v: GroupPermission[]) => v.map(({ permission }) => permission),
    },
  };

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>
  ): Promise<GroupPage> {
    const result = await this.query(params);

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
    const baseParams: BaseCreateArgs = {
      name: params.name,
      description: params.description,
    };

    return this.create(baseParams, transaction);
  }

  public async updateGroup(
    params: MutationUpdateGroupArgs,
    transaction?: Transaction
  ): Promise<Group> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        description: params.input.description,
      },
    };

    return this.update(baseParams, transaction);
  }

  public async softDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Group> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDeleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'>,
    transaction?: Transaction
  ): Promise<Group> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
