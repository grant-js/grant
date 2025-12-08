import { DbSchema } from '@logusgraphics/grant-database';
import {
  CreateProjectUserApiKeyResult,
  ExchangeProjectUserApiKeyResult,
  MutationCreateProjectUserApiKeyArgs,
  MutationDeleteProjectUserApiKeyArgs,
  MutationExchangeProjectUserApiKeyArgs,
  MutationRevokeProjectUserApiKeyArgs,
  ProjectUserApiKey,
  ProjectUserApiKeyPage,
  QueryProjectUserApiKeysArgs,
} from '@logusgraphics/grant-schema';

import type { Transaction } from '@/lib/transaction-manager.lib';
import { TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';

export class ProjectUserApiKeysHandler {
  constructor(
    readonly services: Services,
    readonly db: DbSchema
  ) {}

  public async getProjectUserApiKeys(
    params: QueryProjectUserApiKeysArgs
  ): Promise<ProjectUserApiKeyPage> {
    return await this.services.projectUserApiKeys.getProjectUserApiKeys(params);
  }

  public async createProjectUserApiKey(
    params: MutationCreateProjectUserApiKeyArgs
  ): Promise<CreateProjectUserApiKeyResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.projectUserApiKeys.createProjectUserApiKey(input, tx);
    });
  }

  public async exchangeProjectUserApiKey(
    params: MutationExchangeProjectUserApiKeyArgs
  ): Promise<ExchangeProjectUserApiKeyResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.projectUserApiKeys.exchangeApiKeyForToken(input, tx);
    });
  }

  public async revokeProjectUserApiKey(
    params: MutationRevokeProjectUserApiKeyArgs
  ): Promise<ProjectUserApiKey> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.projectUserApiKeys.revokeProjectUserApiKey(input, tx);
    });
  }

  public async deleteProjectUserApiKey(
    params: MutationDeleteProjectUserApiKeyArgs
  ): Promise<ProjectUserApiKey> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.projectUserApiKeys.deleteProjectUserApiKey(
        {
          id: input.id,
          hardDelete: input.hardDelete ?? undefined,
        },
        tx
      );
    });
  }
}
