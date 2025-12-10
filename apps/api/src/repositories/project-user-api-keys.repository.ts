import { ProjectUserApiKeyModel, projectUserApiKeys } from '@logusgraphics/grant-database';
import {
  AddProjectUserApiKeyInput,
  ProjectUserApiKey,
  QueryProjectUserApiKeysInput,
  RemoveProjectUserApiKeyInput,
} from '@logusgraphics/grant-schema';

import { Transaction } from '@/lib/transaction-manager.lib';

import { PivotRepository } from './common/PivotRepository';

export class ProjectUserApiKeyRepository extends PivotRepository<
  ProjectUserApiKeyModel,
  ProjectUserApiKey
> {
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
