import {
  QueryGroupsArgs,
  MutationUpdateGroupArgs,
  MutationDeleteGroupArgs,
  Group,
  GroupPage,
  CreateGroupInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { groupAuditLogs } from '@/graphql/repositories/groups/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  SelectedFields,
  DeleteParams,
} from '../common';

import {
  getGroupsParamsSchema,
  createGroupParamsSchema,
  updateGroupParamsSchema,
  deleteGroupParamsSchema,
  groupSchema,
} from './schemas';

export class GroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(groupAuditLogs, 'groupId', user, db);
  }

  private async getGroup(groupId: string, transaction?: Transaction): Promise<Group> {
    const existingGroups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (existingGroups.groups.length === 0) {
      throw new Error('Group not found');
    }

    return existingGroups.groups[0];
  }

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>,
    transaction?: Transaction
  ): Promise<GroupPage> {
    const context = 'GroupService.getGroups';
    validateInput(getGroupsParamsSchema, params, context);
    const result = await this.repositories.groupRepository.getGroups(params, transaction);

    const transformedResult = {
      items: result.groups,
      totalCount: result.totalCount,
      hasNextPage: result.hasNextPage,
    };

    validateOutput(
      createDynamicPaginatedSchema(groupSchema, params.requestedFields),
      transformedResult,
      context
    );

    return result;
  }

  public async createGroup(
    params: Omit<CreateGroupInput, 'scope' | 'tagIds' | 'permissionIds'>,
    transaction?: Transaction
  ): Promise<Group> {
    const context = 'GroupService.createGroup';
    const validatedParams = validateInput(createGroupParamsSchema, params, context);
    const { name, description } = validatedParams;

    const group = await this.repositories.groupRepository.createGroup(
      { name, description },
      transaction
    );

    const newValues = {
      id: group.id,
      name: group.name,
      description: group.description,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.logCreate(group.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupSchema), group, context);
  }

  public async updateGroup(
    params: MutationUpdateGroupArgs,
    transaction?: Transaction
  ): Promise<Group> {
    const context = 'GroupService.updateGroup';
    const validatedParams = validateInput(updateGroupParamsSchema, params, context);

    const { id, input } = validatedParams;

    const oldGroup = await this.getGroup(id, transaction);
    const updatedGroup = await this.repositories.groupRepository.updateGroup(
      { id, input },
      transaction
    );

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
      context,
    };

    await this.logUpdate(updatedGroup.id, oldValues, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupSchema), updatedGroup, context);
  }

  public async deleteGroup(
    params: Omit<MutationDeleteGroupArgs, 'scope'> & DeleteParams,
    transaction?: Transaction
  ): Promise<Group> {
    const context = 'GroupService.deleteGroup';
    const validatedParams = validateInput(deleteGroupParamsSchema, params, context);

    const { id, hardDelete } = validatedParams;

    const oldGroup = await this.getGroup(id, transaction);
    const isHardDelete = hardDelete === true;

    const deletedGroup = isHardDelete
      ? await this.repositories.groupRepository.hardDeleteGroup(validatedParams, transaction)
      : await this.repositories.groupRepository.softDeleteGroup(validatedParams, transaction);

    const oldValues = {
      id: oldGroup.id,
      name: oldGroup.name,
      description: oldGroup.description,
      createdAt: oldGroup.createdAt,
      updatedAt: oldGroup.updatedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedGroup.id, oldValues, metadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedGroup.deletedAt,
      };
      await this.logSoftDelete(deletedGroup.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(groupSchema), deletedGroup, context);
  }
}
