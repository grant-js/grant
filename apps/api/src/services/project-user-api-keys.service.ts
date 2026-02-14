import { ProjectUserApiKey } from '@grantjs/schema';

import { NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { DeleteParams } from '@/types';

import { validateInput } from './common';
import {
  addProjectUserApiKeyParamsSchema,
  removeProjectUserApiKeyParamsSchema,
} from './project-user-api-keys.schemas';

import type {
  IAuditLogger,
  IProjectRepository,
  IProjectUserApiKeyRepository,
  IProjectUserApiKeyService,
  IUserRepository,
} from '@grantjs/core';

export class ProjectUserApiKeyService implements IProjectUserApiKeyService {
  constructor(
    private readonly projectRepository: IProjectRepository,
    private readonly userRepository: IUserRepository,
    private readonly projectUserApiKeyRepository: IProjectUserApiKeyRepository,
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

  private async projectHasApiKey(
    projectId: string,
    userId: string,
    apiKeyId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    const existingPivots = await this.projectUserApiKeyRepository.getProjectUserApiKeys(
      {
        projectId,
        userId,
      },
      transaction
    );

    return existingPivots.some((pivot) => pivot.apiKeyId === apiKeyId);
  }

  public async getProjectUserApiKeys(
    params: { projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey[]> {
    await this.projectExists(params.projectId, transaction);
    await this.userExists(params.userId, transaction);

    const result = await this.projectUserApiKeyRepository.getProjectUserApiKeys(
      { projectId: params.projectId, userId: params.userId },
      transaction
    );

    return result;
  }

  public async addProjectUserApiKey(
    params: {
      projectId: string;
      userId: string;
      apiKeyId: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const context = 'ProjectUserApiKeyService.addProjectUserApiKey';
    const validatedParams = validateInput(addProjectUserApiKeyParamsSchema, params, context);

    const { projectId, userId, apiKeyId } = validatedParams;

    const pivot = await this.projectUserApiKeyRepository.addProjectUserApiKey(
      {
        apiKeyId,
        projectId,
        userId,
      },
      transaction
    );

    const newValues = {
      id: pivot.id,
      projectId: pivot.projectId,
      userId: pivot.userId,
      apiKeyId: pivot.apiKeyId,
      createdAt: pivot.createdAt,
      updatedAt: pivot.updatedAt,
    };

    const metadata = {
      context,
    };

    await this.audit.logCreate(pivot.id, newValues, metadata, transaction);

    return pivot;
  }

  public async removeProjectUserApiKey(
    params: {
      projectId: string;
      userId: string;
      apiKeyId: string;
    } & DeleteParams,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const context = 'ProjectUserApiKeyService.removeProjectUserApiKey';
    const validatedParams = validateInput(removeProjectUserApiKeyParamsSchema, params, context);

    const { projectId, userId, apiKeyId, hardDelete } = validatedParams;

    const hasApiKey = await this.projectHasApiKey(projectId, userId, apiKeyId, transaction);

    if (!hasApiKey) {
      throw new NotFoundError('ApiKey');
    }

    const isHardDelete = hardDelete === true;

    const pivot = isHardDelete
      ? await this.projectUserApiKeyRepository.hardDeleteProjectUserApiKey(
          { projectId, userId, apiKeyId },
          transaction
        )
      : await this.projectUserApiKeyRepository.softDeleteProjectUserApiKey(
          { projectId, userId, apiKeyId },
          transaction
        );

    const oldValues = {
      id: pivot.id,
      projectId: pivot.projectId,
      userId: pivot.userId,
      apiKeyId: pivot.apiKeyId,
      createdAt: pivot.createdAt,
      updatedAt: pivot.updatedAt,
    };

    const newValues = {
      ...oldValues,
      deletedAt: pivot.deletedAt,
    };

    const metadata = {
      context,
      hardDelete,
    };

    if (isHardDelete) {
      await this.audit.logHardDelete(pivot.id, oldValues, metadata, transaction);
    } else {
      await this.audit.logSoftDelete(pivot.id, oldValues, newValues, metadata, transaction);
    }

    return pivot;
  }
}
