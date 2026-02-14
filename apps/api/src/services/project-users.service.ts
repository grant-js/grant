import { AddProjectUserInput, ProjectUser, RemoveProjectUserInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { createDynamicSingleSchema, validateInput, validateOutput } from './common';
import {
  addProjectUserParamsSchema,
  getProjectUsersParamsSchema,
  projectUserSchema,
  removeProjectUserParamsSchema,
} from './project-users.schemas';

import type {
  IAuditLogger,
  IProjectRepository,
  IProjectUserRepository,
  IProjectUserService,
  IUserRepository,
} from '@grantjs/core';

export class ProjectUserService implements IProjectUserService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly projectUserRepository: IProjectUserRepository,
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

  private async projectHasUser(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    const existingProjectUsers = await this.projectUserRepository.getProjectUsers(
      {
        projectId,
      },
      transaction
    );

    return existingProjectUsers.some((pu) => pu.userId === userId);
  }

  public async getProjectUsers(
    params: { projectId?: string; userId?: string },
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    const context = 'ProjectUserService.getProjectUsers';
    const validatedParams = validateInput(getProjectUsersParamsSchema, params, context);

    if (validatedParams.projectId) {
      await this.projectExists(validatedParams.projectId, transaction);
    }

    const result = await this.projectUserRepository.getProjectUsers(validatedParams, transaction);
    return validateOutput(createDynamicSingleSchema(projectUserSchema).array(), result, context);
  }

  public async addProjectUser(
    params: AddProjectUserInput,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.addProjectUser';
    const validatedParams = validateInput(addProjectUserParamsSchema, params, context);
    const { projectId, userId } = validatedParams;

    const hasUser = await this.projectHasUser(projectId, userId, transaction);

    if (hasUser) {
      throw new ConflictError('Project already has this user', 'ProjectUser', 'userId');
    }

    const projectUser = await this.projectUserRepository.addProjectUser(
      {
        projectId,
        userId,
      },
      transaction
    );

    const newValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(projectUser.id, newValues, metadata, transaction);

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async removeProjectUser(
    params: RemoveProjectUserInput & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectUser> {
    const context = 'ProjectUserService.removeProjectUser';
    const validatedParams = validateInput(removeProjectUserParamsSchema, params, context);

    const { projectId, userId, hardDelete } = validatedParams;

    const hasUser = await this.projectHasUser(projectId, userId, transaction);

    if (!hasUser) {
      throw new NotFoundError('User');
    }

    const isHardDelete = hardDelete === true;

    const projectUser = isHardDelete
      ? await this.projectUserRepository.hardDeleteProjectUser({ projectId, userId }, transaction)
      : await this.projectUserRepository.softDeleteProjectUser({ projectId, userId }, transaction);

    const oldValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: projectUser.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(projectUser.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(projectUser.id, oldValues, newValues, metadata, transaction);
    }

    return validateOutput(createDynamicSingleSchema(projectUserSchema), projectUser, context);
  }

  public async getUserProjectMemberships(
    userId: string,
    transaction?: Transaction
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      role: string;
      joinedAt: Date;
    }>
  > {
    const memberships = await this.projectUserRepository.getProjectUserMemberships(
      userId,
      transaction
    );

    return memberships.map((m) => ({
      projectId: m.projectId,
      projectName: m.projectName,
      role: m.role,
      joinedAt: m.joinedAt instanceof Date ? m.joinedAt : new Date(m.joinedAt),
    }));
  }
}
