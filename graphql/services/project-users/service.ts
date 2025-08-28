import {
  MutationAddProjectUserArgs,
  MutationRemoveProjectUserArgs,
  ProjectUser,
  QueryProjectUsersArgs,
} from '@/graphql/generated/types';
import {
  IProjectUserRepository,
  IProjectRepository,
  IUserRepository,
} from '@/graphql/repositories';
import { projectUserAuditLogs } from '@/graphql/repositories/project-users/schema';
import { AuthenticatedUser } from '@/graphql/types';

import { AuditService, validateInput, validateOutput, createDynamicSingleSchema } from '../common';

import { IProjectUserService } from './interface';
import {
  getProjectUsersParamsSchema,
  addProjectUserParamsSchema,
  removeProjectUserParamsSchema,
  projectUserSchema,
} from './schemas';

export class ProjectUserService extends AuditService implements IProjectUserService {
  constructor(
    private readonly projectUserRepository: IProjectUserRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    user: AuthenticatedUser | null
  ) {
    super(projectUserAuditLogs, 'projectUserId', user);
  }

  private async projectExists(projectId: string): Promise<void> {
    const projects = await this.projectRepository.getProjects({
      ids: [projectId],
      limit: 1,
    });

    if (projects.projects.length === 0) {
      throw new Error('Project not found');
    }
  }

  private async userExists(userId: string): Promise<void> {
    const users = await this.userRepository.getUsers({
      ids: [userId],
      limit: 1,
    });

    if (users.users.length === 0) {
      throw new Error('User not found');
    }
  }

  private async projectHasUser(projectId: string, userId: string): Promise<boolean> {
    await this.projectExists(projectId);
    await this.userExists(userId);
    const existingProjectUsers = await this.projectUserRepository.getProjectUsers({
      projectId,
    });

    return existingProjectUsers.some((pu) => pu.userId === userId);
  }

  public async getProjectUsers(params: QueryProjectUsersArgs): Promise<ProjectUser[]> {
    const validatedParams = validateInput(
      getProjectUsersParamsSchema,
      params,
      'getProjectUsers method'
    );

    await this.projectExists(validatedParams.projectId);

    const result = await this.projectUserRepository.getProjectUsers(validatedParams);
    return validateOutput(
      createDynamicSingleSchema(projectUserSchema).array(),
      result,
      'getProjectUsers method'
    );
  }

  public async addProjectUser(params: MutationAddProjectUserArgs): Promise<ProjectUser> {
    const validatedParams = validateInput(
      addProjectUserParamsSchema,
      params,
      'addProjectUser method'
    );

    const hasUser = await this.projectHasUser(
      validatedParams.input.projectId,
      validatedParams.input.userId
    );

    if (hasUser) {
      throw new Error('Project already has this user');
    }

    const projectUser = await this.projectUserRepository.addProjectUser(validatedParams);

    const newValues = {
      id: projectUser.id,
      projectId: projectUser.projectId,
      userId: projectUser.userId,
      createdAt: projectUser.createdAt,
      updatedAt: projectUser.updatedAt,
    };

    const metadata = {
      source: 'add_project_user_mutation',
    };

    await this.logCreate(projectUser.id, newValues, metadata);

    return validateOutput(
      createDynamicSingleSchema(projectUserSchema),
      projectUser,
      'addProjectUser method'
    );
  }

  public async removeProjectUser(
    params: MutationRemoveProjectUserArgs & { hardDelete?: boolean }
  ): Promise<ProjectUser> {
    const validatedParams = validateInput(
      removeProjectUserParamsSchema,
      params,
      'deleteProjectUser method'
    );

    const hasUser = await this.projectHasUser(
      validatedParams.input.projectId,
      validatedParams.input.userId
    );

    if (!hasUser) {
      throw new Error('Project does not have this user');
    }

    const isHardDelete = params.hardDelete === true;

    const projectUser = isHardDelete
      ? await this.projectUserRepository.hardDeleteProjectUser(validatedParams)
      : await this.projectUserRepository.softDeleteProjectUser(validatedParams);

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

    if (isHardDelete) {
      const metadata = {
        source: 'hard_delete_project_user_mutation',
      };
      await this.logHardDelete(projectUser.id, oldValues, metadata);
    } else {
      const metadata = {
        source: 'soft_delete_project_user_mutation',
      };
      await this.logSoftDelete(projectUser.id, oldValues, newValues, metadata);
    }

    return validateOutput(
      createDynamicSingleSchema(projectUserSchema),
      projectUser,
      'deleteProjectUser method'
    );
  }
}
