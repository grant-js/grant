import type {
  IAuditLogger,
  IGroupRepository,
  IProjectRepository,
  IProjectUserGroupRepository,
  IProjectUserGroupService,
  IUserRepository,
} from '@grantjs/core';
import {
  AddProjectUserGroupInput,
  ProjectUserGroup,
  QueryProjectUserGroupsInput,
  RemoveProjectUserGroupInput,
} from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectUserGroupInputSchema,
  getProjectUserGroupsParamsSchema,
  projectUserGroupSchema,
  removeProjectUserGroupInputSchema,
} from './project-user-groups.schemas';

export class ProjectUserGroupService implements IProjectUserGroupService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly groupRepository: IGroupRepository,
    private readonly projectUserGroupRepository: IProjectUserGroupRepository,
    private readonly audit: IAuditLogger
  ) {}

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project');
    }
  }

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

  private async projectHasUserGroup(
    projectId: string,
    userId: string,
    groupId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    await this.groupExists(groupId, transaction);
    const existing = await this.projectUserGroupRepository.getProjectUserGroups(
      { projectId, userId },
      transaction
    );

    return existing.some((row) => row.groupId === groupId);
  }

  public async getProjectUserGroups(
    params: QueryProjectUserGroupsInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup[]> {
    const context = 'ProjectUserGroupService.getProjectUserGroups';
    const validatedParams = validateInput(getProjectUserGroupsParamsSchema, params, context);

    if (validatedParams.projectId) {
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.projectUserGroupRepository.getProjectUserGroups(
      validatedParams,
      transaction
    );

    return validateOutput(
      createDynamicSingleSchema(projectUserGroupSchema).array(),
      result,
      context
    );
  }

  public async addProjectUserGroup(
    params: AddProjectUserGroupInput,
    transaction?: Transaction
  ): Promise<ProjectUserGroup> {
    const context = 'ProjectUserGroupService.addProjectUserGroup';
    const validatedParams = validateInput(addProjectUserGroupInputSchema, params, context);
    const { projectId, userId, groupId } = validatedParams;

    const hasRow = await this.projectHasUserGroup(projectId, userId, groupId, transaction);

    if (hasRow) {
      throw new ConflictError('Project already has this user group', 'ProjectUserGroup', 'groupId');
    }

    const row = await this.projectUserGroupRepository.addProjectUserGroup(
      validatedParams,
      transaction
    );

    const newValues = {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      groupId: row.groupId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    await this.audit.logCreate(row.id, newValues, { context }, transaction);

    return validateOutput(createDynamicSingleSchema(projectUserGroupSchema), row, context);
  }

  public async removeProjectUserGroup(
    params: RemoveProjectUserGroupInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectUserGroup> {
    const context = 'ProjectUserGroupService.removeProjectUserGroup';
    const validatedParams = validateInput(removeProjectUserGroupInputSchema, params, context);
    const { projectId, userId, groupId, hardDelete } = validatedParams;

    const hasRow = await this.projectHasUserGroup(projectId, userId, groupId, transaction);

    if (!hasRow) {
      throw new NotFoundError('Group');
    }

    const isHardDelete = hardDelete === true;

    const row = isHardDelete
      ? await this.projectUserGroupRepository.hardDeleteProjectUserGroup(
          validatedParams,
          transaction
        )
      : await this.projectUserGroupRepository.softDeleteProjectUserGroup(
          validatedParams,
          transaction
        );

    const oldValues = {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      groupId: row.groupId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    const newValues = { ...oldValues, deletedAt: row.deletedAt };
    const metadata = { context, hardDelete };

    if (isHardDelete) {
      await this.audit.logHardDelete(row.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(row.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectUserGroupSchema), row, context);
  }
}
