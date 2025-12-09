import { ProjectUserApiKeyModel, projectUserApiKeys } from '@logusgraphics/grant-database';
import { ProjectUserApiKey } from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import {
  BasePivotAddArgs,
  BasePivotQueryArgs,
  BasePivotRemoveArgs,
  PivotRepository,
} from './common/PivotRepository';

export class ProjectUserApiKeyRepository extends PivotRepository<
  ProjectUserApiKeyModel,
  ProjectUserApiKey
> {
  protected table = projectUserApiKeys;
  protected parentIdField: keyof ProjectUserApiKeyModel = 'projectId';
  protected relatedIdField: keyof ProjectUserApiKeyModel = 'userId';

  protected toEntity(dbPivot: ProjectUserApiKeyModel): ProjectUserApiKey {
    return {
      id: dbPivot.id,
      projectId: dbPivot.projectId,
      userId: dbPivot.userId,
      apiKeyId: dbPivot.apiKeyId,
      createdAt: dbPivot.createdAt,
      updatedAt: dbPivot.updatedAt,
      deletedAt: dbPivot.deletedAt ?? undefined,
    };
  }

  public async getProjectUserApiKeys(
    params: { projectId: string; userId: string },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey[]> {
    const baseParams: BasePivotQueryArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    return this.query(baseParams, transaction);
  }

  public async attachApiKey(
    params: {
      apiKeyId: string;
      projectId: string;
      userId: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const baseParams: BasePivotAddArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
      apiKeyId: params.apiKeyId,
    };

    return this.add(baseParams, transaction);
  }

  public async detachApiKey(
    params: {
      projectId: string;
      userId: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    return this.softDelete(baseParams, transaction);
  }

  public async hardDetachApiKey(
    params: {
      projectId: string;
      userId: string;
    },
    transaction?: Transaction
  ): Promise<ProjectUserApiKey> {
    const baseParams: BasePivotRemoveArgs = {
      parentId: params.projectId,
      relatedId: params.userId,
    };

    return this.hardDelete(baseParams, transaction);
  }
}
