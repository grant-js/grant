import { GROUP_DEFINITIONS } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';
import { DbSchema, groupAuditLogs } from '@grantjs/database';
import {
  CreateGroupInput,
  Group,
  GroupPage,
  MutationDeleteGroupArgs,
  QueryGroupsArgs,
  UpdateGroupInput,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  SelectedFields,
  createDynamicPaginatedSchema,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  createGroupParamsSchema,
  deleteGroupParamsSchema,
  getGroupsParamsSchema,
  groupSchema,
  updateGroupParamsSchema,
} from './groups.schemas';

export class GroupService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(groupAuditLogs, 'groupId', user, db);
  }

  private getCorePlatformGroupNames(): string[] {
    return Object.values(GROUP_DEFINITIONS).map((group) => group.name);
  }

  private validateGroupNameNotReserved(groupName: string): void {
    const coreGroupNames = this.getCorePlatformGroupNames();
    if (coreGroupNames.includes(groupName)) {
      throw new BadRequestError(
        `Group name '${groupName}' is reserved for core platform groups and cannot be used`,
        'errors:validation.reservedGroupName',
        {
          groupName,
        }
      );
    }
  }

  private async getGroup(groupId: string, transaction?: Transaction): Promise<Group> {
    const existingGroups = await this.repositories.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (existingGroups.groups.length === 0) {
      throw new NotFoundError('Group not found', 'errors:notFound.group');
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
    const { name, description, metadata } = validatedParams;

    // Validate that the group name is not a reserved core platform group name
    this.validateGroupNameNotReserved(name);

    const group = await this.repositories.groupRepository.createGroup(
      { name, description, metadata: metadata ?? {} },
      transaction
    );

    const newValues = {
      id: group.id,
      name: group.name,
      description: group.description,
      metadata: group.metadata,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };

    const auditMetadata = {
      context,
    };

    await this.logCreate(group.id, newValues, auditMetadata, transaction);

    return validateOutput(createDynamicSingleSchema(groupSchema), group, context);
  }

  public async updateGroup(
    id: string,
    input: UpdateGroupInput,
    transaction?: Transaction
  ): Promise<Group> {
    const context = 'GroupService.updateGroup';
    validateInput(updateGroupParamsSchema, { id, input }, context);

    // If the group name is being updated, validate that it's not a reserved core platform group name
    if (input.name) {
      this.validateGroupNameNotReserved(input.name);
    }

    const oldGroup = await this.getGroup(id, transaction);
    const updatedGroup = await this.repositories.groupRepository.updateGroup(
      id,
      input,
      transaction
    );

    const oldValues = {
      id: oldGroup.id,
      name: oldGroup.name,
      description: oldGroup.description,
      metadata: oldGroup.metadata,
      createdAt: oldGroup.createdAt,
      updatedAt: oldGroup.updatedAt,
    };

    const newValues = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      metadata: updatedGroup.metadata,
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt,
    };

    const auditMetadata = {
      context,
    };

    await this.logUpdate(updatedGroup.id, oldValues, newValues, auditMetadata, transaction);

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

    const auditMetadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.logHardDelete(deletedGroup.id, oldValues, auditMetadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedGroup.deletedAt,
      };
      await this.logSoftDelete(deletedGroup.id, oldValues, newValues, auditMetadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(groupSchema), deletedGroup, context);
  }
}
