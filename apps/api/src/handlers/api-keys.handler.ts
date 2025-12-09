import { DbSchema } from '@logusgraphics/grant-database';
import {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyResult,
  ExchangeApiKeyResult,
  MutationCreateApiKeyArgs,
  MutationDeleteApiKeyArgs,
  MutationExchangeApiKeyArgs,
  MutationRevokeApiKeyArgs,
  QueryApiKeysArgs,
  Tenant,
} from '@logusgraphics/grant-schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { SelectedFields } from '@/services/common';

import { ScopeHandler } from './base/scope-handler';

export class ApiKeysHandler extends ScopeHandler {
  constructor(
    readonly cache: IEntityCacheAdapter,
    readonly services: Services,
    readonly db: DbSchema
  ) {
    super(cache, services);
  }

  public async getApiKeys(params: QueryApiKeysArgs & SelectedFields<ApiKey>): Promise<ApiKeyPage> {
    const { scope, page, limit, sort, search, ids, requestedFields } = params;

    let apiKeyIds = await this.getScopedApiKeyIds(scope);

    if (ids && ids.length > 0) {
      apiKeyIds = ids.filter((apiKeyId) => apiKeyIds.includes(apiKeyId));
    }

    if (apiKeyIds.length === 0) {
      return {
        apiKeys: [],
        totalCount: 0,
        hasNextPage: false,
      };
    }

    const apiKeysResult = await this.services.apiKeys.getApiKeys({
      ids: apiKeyIds,
      page,
      limit,
      sort,
      search,
      requestedFields,
    });

    return apiKeysResult;
  }

  public async createApiKey(params: MutationCreateApiKeyArgs): Promise<CreateApiKeyResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { scope, name, description, expiresAt } = input;

      switch (scope.tenant) {
        case Tenant.ProjectUser: {
          const [projectId, userId] = scope.id.split(':');
          if (!projectId || !userId) {
            throw new BadRequestError(
              'Invalid projectUser scope: id must be in format "projectId:userId"',
              'errors:validation.invalid',
              { field: 'scope.id' }
            );
          }

          const apiKey = await this.services.apiKeys.createApiKey(
            {
              name,
              description,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );

          await this.services.projectUserApiKeys.addProjectUserApiKey(
            {
              projectId,
              userId,
              apiKeyId: apiKey.id,
            },
            tx
          );

          this.addApiKeyIdToScopeCache(scope, apiKey.id);
          return apiKey;
        }

        default:
          throw new BadRequestError(
            `Unsupported tenant type: ${scope.tenant}`,
            'errors:validation.invalid',
            { field: 'tenant' }
          );
      }
    });
  }

  public async exchangeApiKey(params: MutationExchangeApiKeyArgs): Promise<ExchangeApiKeyResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.apiKeys.exchangeApiKeyForToken(input, tx);
    });
  }

  public async revokeApiKey(params: MutationRevokeApiKeyArgs): Promise<ApiKey> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.apiKeys.revokeApiKey(input, tx);
    });
  }

  public async deleteApiKey(params: MutationDeleteApiKeyArgs): Promise<ApiKey> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      return await this.services.apiKeys.deleteApiKey(
        {
          id: input.id,
          hardDelete: input.hardDelete ?? undefined,
        },
        tx
      );
    });
  }
}
