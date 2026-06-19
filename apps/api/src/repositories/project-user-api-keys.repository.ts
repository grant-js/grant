import type { IProjectUserApiKeyRepository } from '@grantjs/core';
import { ProjectUserApiKeyModel, projectUserApiKeys } from '@grantjs/database';
import {
  AddProjectUserApiKeyInput,
  ProjectUserApiKey,
  QueryProjectUserApiKeysInput,
  RemoveProjectUserApiKeyInput,
} from '@grantjs/schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class ProjectUserApiKeyRepository
  extends PivotRepository<ProjectUserApiKeyModel, ProjectUserApiKey>
  implements IProjectUserApiKeyRepository
{
  protected table = projectUserApiKeys;
  protected uniqueIndexFields: Array<keyof ProjectUserApiKeyModel> = [
    'projectId',
    'userId',
    'apiKeyId',
  ];

  protected toEntity(dbPivot: ProjectUserApiKeyModel): ProjectUserApiKey {
    return dbPivot;
  }

  public async getProjectUserApiKeys(
    params: QueryProjectUserApiKeysInput,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey[]> {
    return this.query(params, transaction);
  }

  public async countProjectUserApiKeys(
    params: { projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<number> {
    return this.countActive({ projectId: params.projectId, userId: params.userId }, transaction);
  }

  public async countProjectUserApiKeysByUserIds(
    params: { projectId: string; userIds: string[] },
    transaction?: Transaction
  ): Promise<Map<string, number>> {
    const projectPivots = await this.queryIntersection(
      { projectId: [params.projectId], userId: params.userIds },
      transaction
    );
    const counts = new Map<string, number>();

    for (const pivot of projectPivots) {
      counts.set(pivot.userId, (counts.get(pivot.userId) ?? 0) + 1);
    }

    return counts;
  }

  public async addProjectUserApiKey(
    params: AddProjectUserApiKeyInput,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.add(params, transaction);
  }

  public async softDeleteProjectUserApiKey(
    params: RemoveProjectUserApiKeyInput,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.softDelete(params, transaction);
  }

  public async hardDeleteProjectUserApiKey(
    params: RemoveProjectUserApiKeyInput,
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    return this.hardDelete(params, transaction);
  }
}
