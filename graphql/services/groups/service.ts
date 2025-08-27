import {
  QueryGroupsArgs,
  MutationCreateGroupArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
} from '@/graphql/generated/types';
import { IGroupRepository } from '@/graphql/repositories/groups/interface';
import { groupAuditLogs } from '@/graphql/repositories/groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, paginatedResponseSchema } from '../common';

import { IGroupService } from './interface';
import {
  getGroupsParamsSchema,
  createGroupParamsSchema,
  updateGroupParamsSchema,
  deleteGroupParamsSchema,
  groupSchema,
} from './schemas';

export class GroupService extends AuditService implements IGroupService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    user: AuthenticatedUser | null
  ) {
    super(groupAuditLogs, 'groupId', user);
  }

  private async getGroup(groupId: string): Promise<Group> {
    const groups = await this.groupRepository.getGroups({
      ids: [groupId],
      limit: 1,
    });

    if (groups.groups.length === 0) {
      throw new Error('Group not found');
    }

    return groups.groups[0];
  }

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & { requestedFields?: string[] }
  ): Promise<GroupPage> {
    const validatedParams = validateInput(getGroupsParamsSchema, params, 'getGroups method');
    const result = await this.groupRepository.getGroups(validatedParams as any);

    // Transform repository result to standard format for validation
    const transformedResult = {
      items: result.groups,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    const validatedResult = validateOutput(
      paginatedResponseSchema(groupSchema),
      transformedResult,
      'getGroups method'
    ) as any;

    return {
      groups: validatedResult.items,
      totalCount: validatedResult.totalCount,
      hasNextPage: validatedResult.hasNextPage,
    };
  }

  public async createGroup(params: MutationCreateGroupArgs): Promise<Group> {
    const validatedParams = validateInput(createGroupParamsSchema, params, 'createGroup method');
    const group = await this.groupRepository.createGroup(validatedParams);

    const newValues = {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };

    const metadata = {
      source: 'create_group_mutation',
    };

    await this.logCreate(group.id, newValues, metadata);

    return validateOutput(groupSchema, group, 'createGroup method');
  }

  public async updateGroup(params: MutationUpdateGroupArgs): Promise<Group> {
    const validatedParams = validateInput(updateGroupParamsSchema, params, 'updateGroup method');

    const oldGroup = await this.getGroup(validatedParams.id);
    const updatedGroup = await this.groupRepository.updateGroup(validatedParams);

    const oldValues = {
      id: oldGroup.id,
      name: oldGroup.name,
      description: oldGroup.description,
      createdAt: oldGroup.createdAt,
      updatedAt: oldGroup.updatedAt,
    };

    const newValues = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
    };

    const metadata = {
      source: 'update_group_mutation',
    };

    await this.logUpdate(updatedGroup.id, oldValues, newValues, metadata);

    return validateOutput(groupSchema, updatedGroup, 'updateGroup method');
  }

  public async deleteGroup(
    params: MutationDeleteGroupArgs & { hardDelete?: boolean }
  ): Promise<Group> {
    const validatedParams = validateInput(deleteGroupParamsSchema, params, 'deleteGroup method');

    const oldGroup = await this.getGroup(validatedParams.id);
    const isHardDelete = params.hardDelete === true;

    const deletedGroup = isHardDelete
      ? await this.groupRepository.hardDeleteGroup(validatedParams)
      : await this.groupRepository.softDeleteGroup(validatedParams);

    const oldValues = {
      id: oldGroup.id,
      name: oldGroup.name,
      description: oldGroup.description,
      createdAt: oldGroup.createdAt,
      updatedAt: oldGroup.updatedAt,
    };

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_group_mutation',
      };
      await this.logHardDelete(deletedGroup.id, oldValues, metadata);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedGroup.deletedAt,
      };

      const metadata = {
        source: 'soft_delete_group_mutation',
      };
      await this.logSoftDelete(deletedGroup.id, oldValues, newValues, metadata);
    }

    return validateOutput(groupSchema, deletedGroup, 'deleteGroup method');
  }
}
