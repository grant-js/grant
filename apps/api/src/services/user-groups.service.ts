import type {
  IAuditLogger,
  IEventPublisher,
  IGroupRepository,
  IUserGroupRepository,
  IUserGroupService,
  IUserRepository,
} from '@grantjs/core';
import {
  AddUserGroupInput,
  QueryUserGroupsInput,
  RemoveUserGroupInput,
  UserGroup,
} from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addUserGroupInputSchema,
  queryUserGroupsArgsSchema,
  removeUserGroupInputSchema,
  userGroupSchema,
} from './user-groups.schemas';

export class UserGroupService implements IUserGroupService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly userGroupRepository: IUserGroupRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher
  ) {}

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.userRepository.getUsers({ ids: [userId], limit: 1 }, transaction);

    if (users.users.length === 0) {
      throw new NotFoundError('User');
    }
  }

  private async groupExists(groupId: string, transaction?: Transaction): Promise<void> {
    const groups = await this.groupRepository.getGroups({ ids: [groupId], limit: 1 }, transaction);

    if (groups.groups.length === 0) {
      throw new NotFoundError('Group');
    }
  }

  private async userHasGroup(
    userId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.userExists(userId, transaction);
    await this.groupExists(groupId, transaction);
    const existing = await this.userGroupRepository.getUserGroups({ userId }, transaction);

    return existing.some((ug) => ug.groupId === groupId);
  }

  public async getUserGroups(
    params: QueryUserGroupsInput,
    transaction?: Transaction
  ): Promise<UserGroup[]> {
    const context = 'UserGroupService.getUserGroups';
    const validatedParams = validateInput(queryUserGroupsArgsSchema, params, context);
    const { userId, groupId } = validatedParams;

    if (userId) {
      await this.userExists(userId, transaction);
    }
    if (groupId) {
      await this.groupExists(groupId, transaction);
    }

    const result = await this.userGroupRepository.getUserGroups(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(userGroupSchema).array(), result, context);
  }

  public async countUserGroups(
    params: { userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.userGroupRepository.countUserGroups(params, transaction);
  }

  public async addUserGroup(
    params: AddUserGroupInput,
    transaction?: Transaction
  ): Promise<UserGroup> {
    const context = 'UserGroupService.addUserGroup';
    const validatedParams = validateInput(addUserGroupInputSchema, params, context);
    const { userId, groupId } = validatedParams;

    const hasGroup = await this.userHasGroup(userId, groupId, transaction);

    if (hasGroup) {
      const existingGroups = await this.userGroupRepository.getUserGroups(
        { userId, groupId },
        transaction
      );
      return validateOutput(createDynamicSingleSchema(userGroupSchema), existingGroups[0], context);
    }

    const userGroup = await this.userGroupRepository.addUserGroup(validatedParams, transaction);

    const newValues = {
      id: userGroup.id,
      userId: userGroup.userId,
      groupId: userGroup.groupId,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
    };

    await this.audit.logCreate(userGroup.id, newValues, { context }, transaction);

    await this.events.publish(
      {
        type: 'user.group_assigned',
        aggregate: { kind: 'userGroup', id: userGroup.id },
        subjectUserId: userGroup.userId,
        data: { after: newValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userGroupSchema), userGroup, context);
  }

  public async removeUserGroup(
    params: RemoveUserGroupInput & DeleteParams,
    transaction?: Transaction
  ): Promise<UserGroup> {
    const context = 'UserGroupService.removeUserGroup';
    const validatedParams = validateInput(removeUserGroupInputSchema, params, context);
    const { userId, groupId, hardDelete } = validatedParams;

    const hasGroup = await this.userHasGroup(userId, groupId, transaction);

    if (!hasGroup) {
      throw new NotFoundError('UserGroup');
    }

    const isHardDelete = hardDelete === true;

    const userGroup = isHardDelete
      ? await this.userGroupRepository.hardDeleteUserGroup(validatedParams, transaction)
      : await this.userGroupRepository.softDeleteUserGroup(validatedParams, transaction);

    const oldValues = {
      id: userGroup.id,
      userId: userGroup.userId,
      groupId: userGroup.groupId,
      createdAt: userGroup.createdAt,
      updatedAt: userGroup.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: userGroup.deletedAt,
    };

    const metadata = { context, hardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(userGroup.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(userGroup.id, oldValues, newValues, metadata, transaction);
    }

    await this.events.publish(
      {
        type: 'user.group_revoked',
        aggregate: { kind: 'userGroup', id: userGroup.id },
        subjectUserId: userGroup.userId,
        data: { before: oldValues },
      },
      transaction
    );

    return validateOutput(createDynamicSingleSchema(userGroupSchema), userGroup, context);
  }
}
