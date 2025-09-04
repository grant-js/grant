import {
  AddProjectUserInput,
  ProjectUser,
  RemoveProjectUserInput,
} from '@/graphql/generated/types';
import { DbSchema } from '@/graphql/lib/providers/database/connection';
import { Transaction } from '@/graphql/lib/transactions/TransactionManager';
import { Repositories } from '@/graphql/repositories';
import { projectUserAuditLogs } from '@/graphql/repositories/project-users/schema';
import { AuthenticatedUser } from '@/graphql/types';

import {
  AuditService,
  validateInput,
  validateOutput,
  createDynamicSingleSchema,
  DeleteParams,
} from '../common';

import {
  getProjectUsersParamsSchema,
  addProjectUserParamsSchema,
  removeProjectUserParamsSchema,
  projectUserSchema,
} from './schemas';

export class ProjectUserService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(projectUserAuditLogs, 'projectUserId', user, db);
  }

  private async projectExists(projectId: string, transaction?: Transaction): Promise<void> {
    const projects = await this.repositories.projectRepository.getProjects(
      { ids: [projectId], limit: 1 },
      transaction
    );

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async userExists(userId: string, transaction?: Transaction): Promise<void> {
    const users = await this.repositories.userRepository.getUsers(
      { ids: [userId], limit: 1 },
      transaction
    );

    if (users.users.length === 0) {
      throw new Error('User not found');
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
    params: { projectId: string },
    transaction?: Transaction
  ): Promise<ProjectUser[]> {
    const context = 'ProjectUserService.getProjectUsers';
    const validatedParams = validateInput(getProjectUsersParamsSchema, params, context);

    await this.projectExists(validatedParams.projectId, transaction);

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
      throw new Error('Project already has this user');
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
      throw new Error('Project does not have this user');
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
}
