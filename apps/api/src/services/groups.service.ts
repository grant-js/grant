import { GROUP_DEFINITIONS } from '@grantjs/constants';
import type { IAuditLogger, IEventPublisher, IGroupRepository, IGroupService } from '@grantjs/core';
import {
  CreateGroupInput,
  Group,
  GroupPage,
  MutationDeleteGroupArgs,
  QueryGroupsArgs,
  UpdateGroupInput,
} from '@grantjs/schema';

import { BadRequestError, NotFoundError } from '@/lib/errors';
import { buildDelta } from '@/lib/events';
import { buildSearchDocument } from '@/lib/search-document.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams, SelectedFields } from '@/types';

import {
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

export class GroupService implements IGroupService {
  constructor(
    private readonly groupRepository: IGroupRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private getCorePlatformGroupNames(): string[] {
    return Object.values(GROUP_DEFINITIONS).map((group) => group.name);
  }

  private validateGroupNameNotReserved(groupName: string): void {
    const coreGroupNames = this.getCorePlatformGroupNames();
    if (coreGroupNames.includes(groupName)) {
      throw new BadRequestError(
        `Group name '${groupName}' is reserved for core platform groups and cannot be used`
      );
    }
  }

  private async getGroup(groupId: string, transaction?: Transaction): Promise<Group> {
    const existingGroups = await this.groupRepository.getGroups(
      { ids: [groupId], limit: 1 },
      transaction
    );

    if (existingGroups.groups.length === 0) {
      throw new NotFoundError('Group');
    }

    return existingGroups.groups[0];
  }

  public async getGroups(
    params: Omit<QueryGroupsArgs, 'scope'> & SelectedFields<Group>,
    transaction?: Transaction
  ): Promise<GroupPage> {
    const context = 'GroupService.getGroups';
    validateInput(getGroupsParamsSchema, params, context);
    const result = await this.groupRepository.getGroups(params, transaction);

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
    params: Omit<CreateGroupInput, 'scope' | 'tagIds' | 'permissionIds'> & {
      searchDocument?: string;
    },
    transaction?: Transaction
  ): Promise<Group> {
    const context = 'GroupService.createGroup';
    const { searchDocument: providedSearchDocument, ...rest } = params;
    const validatedParams = validateInput(createGroupParamsSchema, rest, context);
    const { name, description, metadata } = validatedParams;

    // Validate that the group name is not a reserved core platform group name
    this.validateGroupNameNotReserved(name);

    const searchDocument =
      providedSearchDocument ??
      buildSearchDocument({
        kind: 'group',
        name,
        description,
        metadata: metadata as Record<string, unknown> | undefined,
      });

    const group = await this.groupRepository.createGroup(
      { name, description, metadata: metadata ?? {}, searchDocument },
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

    await this.audit.logCreate(group.id, newValues, auditMetadata, transaction);

    await this.events.publish(
      {
        type: 'group.created',
        aggregate: { kind: 'group', id: group.id },
        data: { after: newValues },
      },
      transaction
    );

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
    const updatedGroup = await this.groupRepository.updateGroup(id, input, transaction);

    const searchDocument = buildSearchDocument({
      kind: 'group',
      name: updatedGroup.name,
      description: updatedGroup.description,
      metadata: updatedGroup.metadata as Record<string, unknown>,
    });
    const groupWithSearch =
      searchDocument !== (updatedGroup as Group & { searchDocument?: string }).searchDocument
        ? await this.groupRepository.updateGroup(
            id,
            { searchDocument } as unknown as UpdateGroupInput,
            transaction
          )
        : updatedGroup;

    const oldValues = {
      id: oldGroup.id,
      name: oldGroup.name,
      description: oldGroup.description,
      metadata: oldGroup.metadata,
      createdAt: oldGroup.createdAt,
      updatedAt: oldGroup.updatedAt,
    };

    const newValues = {
      id: groupWithSearch.id,
      name: groupWithSearch.name,
      description: groupWithSearch.description,
      metadata: groupWithSearch.metadata,
      createdAt: groupWithSearch.createdAt,
      updatedAt: groupWithSearch.updatedAt,
    };

    const auditMetadata = {
      context,
    };

    await this.audit.logUpdate(
      groupWithSearch.id,
      oldValues,
      newValues,
      auditMetadata,
      transaction
    );

    await this.events.publish(
      {
        type: 'group.updated',
        aggregate: { kind: 'group', id: groupWithSearch.id },
        data: { before: oldValues, after: newValues, delta: buildDelta(oldValues, newValues) },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(groupSchema), groupWithSearch, context);
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
      ? await this.groupRepository.hardDeleteGroup(validatedParams, transaction)
      : await this.groupRepository.softDeleteGroup(validatedParams, transaction);

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
      await this.audit.logHardDelete(deletedGroup.id, oldValues, auditMetadata, transaction);
    } else {
      const newValues = {
        ...oldValues,
        deletedAt: deletedGroup.deletedAt,
      };
      await this.audit.logSoftDelete(
        deletedGroup.id,
        oldValues,
        newValues,
        auditMetadata,
        transaction
      );
    }

    await this.events.publish(
      {
        type: 'group.deleted',
        aggregate: { kind: 'group', id: deletedGroup.id },
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(groupSchema), deletedGroup, context);
  }
}
