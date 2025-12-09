import { DbSchema, projectUserApiKeyAuditLogs } from '@logusgraphics/grant-database';
import { ProjectUserApiKey } from '@logusgraphics/grant-schema';

import { ConflictError, NotFoundError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

import { AuditService, DeleteParams, validateInput } from './common';
import {
  addProjectUserApiKeyParamsSchema,
  removeProjectUserApiKeyParamsSchema,
} from './project-user-api-keys.schemas';

export class ProjectUserApiKeyService extends AuditService {
  constructor(
    private readonly repositories: Repositories,
    user: AuthenticatedUser | null,
    db: DbSchema
  ) {
    super(projectUserApiKeyAuditLogs, 'projectUserApiKeyId', user, db);
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

  private async projectHasApiKey(
    projectId: string,
    userId: string,
    apiKeyId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    await this.projectExists(projectId, transaction);
    await this.userExists(userId, transaction);
    const existingPivots =
      await this.repositories.projectUserApiKeyRepository.getProjectUserApiKeys(
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

    const result = await this.repositories.projectUserApiKeyRepository.getProjectUserApiKeys(
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

    const hasApiKey = await this.projectHasApiKey(projectId, userId, apiKeyId, transaction);

    if (hasApiKey) {
      throw new ConflictError(
        'Project user already has this API key',
        'errors:conflict.duplicateEntry',
        {
          resource: 'ProjectUserApiKey',
          field: 'apiKeyId',
        }
      );
    }

    const pivot = await this.repositories.projectUserApiKeyRepository.attachApiKey(
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

    await this.logCreate(pivot.id, newValues, metadata, transaction);

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
      throw new NotFoundError('Project user does not have this API key', 'errors:notFound.apiKey');
    }

    const isHardDelete = hardDelete === true;

    const pivot = isHardDelete
      ? await this.repositories.projectUserApiKeyRepository.hardDetachApiKey(
          { projectId, userId },
          transaction
        )
      : await this.repositories.projectUserApiKeyRepository.detachApiKey(
          { projectId, userId },
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
      await this.logHardDelete(pivot.id, oldValues, metadata, transaction);
    } else {
      await this.logSoftDelete(pivot.id, oldValues, newValues, metadata, transaction);
    }

    return pivot;
  }
}
