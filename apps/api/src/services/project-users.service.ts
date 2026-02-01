import { GrantAuth } from '@grantjs/core';
import { DbSchema, projectUserAuditLogs } from '@grantjs/database';
import { AddProjectUserInput, ProjectUser, RemoveProjectUserInput } from '@grantjs/schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';

import {
  AuditService,
  DeleteParams,
  createDynamicSingleSchema,
  validateInput,
  validateOutput,
} from './common';
import {
  addProjectUserParamsSchema,
  getProjectUsersParamsSchema,
  projectUserSchema,
  removeProjectUserParamsSchema,
} from './project-users.schemas';

export class ProjectUserService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    readonly user: GrantAuth | null,
    readonly db: DbSchema
  ) {
    super(projectUserAuditLogs, 'projectUserId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new NotFoundError('Project not found', 'errors:notFound.project');
    }
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.repositories.userRepository.getUsers(
      { ids: [userId], limit: 1 },
      transaction
    );

    if (users.users.length === 0) {
      throw new NotFoundError('User not found', 'errors:notFound.user');
    }
  }

  private async projectHasUser(
    projectId: string,
    userId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    const existingProjectUsers = await this.repositories.projectUserRepository.getProjectUsers(
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

    const result = await this.repositories.projectUserRepository.getProjectUsers(
      validatedParams,
      transaction
    );
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
      throw new ConflictError('Project already has this user', 'errors:conflict.duplicateEntry', {
        resource: 'ProjectUser',
        field: 'userId',
      });
    }

    const projectUser = await this.repositories.projectUserRepository.addProjectUser(
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

    await this.logCreate(projectUser.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Project does not have this user', 'errors:notFound.user');
    }

    const isHardDelete = hardDelete === true;

    const projectUser = isHardDelete
      ? await this.repositories.projectUserRepository.hardDeleteProjectUser(
          { projectId, userId },
          transaction
        )
      : await this.repositories.projectUserRepository.softDeleteProjectUser(
          { projectId, userId },
          transaction
        );

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
      await this.logHardDelete(projectUser.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(projectUser.id, oldValues, newValues, metadata, transaction);
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
    const memberships = await this.repositories.projectUserRepository.getProjectUserMemberships(
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
