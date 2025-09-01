import {
  QueryGroupsArgs,
  MutationCreateGroupArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
} from '@/graphql/generated/types';
import {
  EntityRepository,
  BaseQueryArgs,
  BaseCreateArgs,
  BaseUpdateArgs,
  BaseDeleteArgs,
} from '@/graphql/repositories/common';

import { GroupModel, groups } from './schema';

export class GroupRepository extends EntityRepository<GroupModel, Group> {
  protected table = groups;
  protected schemaName = 'groups' as const;
  protected searchFields: Array<keyof GroupModel> = ['name', 'description'];
  protected defaultSortField: keyof GroupModel = 'createdAt';

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & { requestedFields?: Array<keyof GroupModel> }
  ): Promise<GroupPage> {
    const baseParams: BaseQueryArgs<GroupModel> = {
      ids: params.ids || undefined,
      page: params.page || undefined,
      limit: params.limit || undefined,
      search: params.search || undefined,
      sort: params.sort
        ? {
            field: params.sort.field as keyof GroupModel,
            order: params.sort.order,
          }
        : undefined,
      requestedFields: params.requestedFields as Array<keyof GroupModel> | undefined,
    };

    const result = await this.query(baseParams);

    return {
      groups: result.items,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };
  }

  public async createGroup(params: MutationCreateGroupArgs): Promise<Group> {
    const baseParams: BaseCreateArgs = {
      name: params.input.name,
      description: params.input.description,
    };

    return this.create(baseParams);
  }

  public async updateGroup(params: MutationUpdateGroupArgs): Promise<Group> {
    const baseParams: BaseUpdateArgs = {
      id: params.id,
      input: {
        name: params.input.name,
        description: params.input.description,
      },
    };

    return this.update(baseParams);
  }

  public async softDeleteGroup(params: MutationDeleteGroupArgs): Promise<Group> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.softDelete(baseParams);
  }

  public async hardDeleteGroup(params: MutationDeleteGroupArgs): Promise<Group> {
    const baseParams: BaseDeleteArgs = {
      id: params.id,
    };

    return this.hardDelete(baseParams);
  }
}
