import { DbSchema } from '@grantjs/database';
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
  Role,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { Transaction, TransactionManager } from '@/lib/transaction-manager.lib';
import { Services } from '@/services';
import { SelectedFields } from '@/services/common';

import { CacheHandler } from './base/cache-handler';

export class ApiKeysHandler extends CacheHandler {
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

    if (scope.tenant === Tenant.AccountProject || scope.tenant === Tenant.OrganizationProject) {
      const apiKeysWithRole = await this.enrichApiKeysWithRole(
        scope as { tenant: Tenant.AccountProject | Tenant.OrganizationProject; id: string },
        apiKeysResult.apiKeys
      );
      return {
        ...apiKeysResult,
        apiKeys: apiKeysWithRole,
      };
    }

    return apiKeysResult;
  }

  private async enrichApiKeysWithRole(
    scope: { tenant: Tenant.AccountProject | Tenant.OrganizationProject; id: string },
    apiKeys: ApiKey[]
  ): Promise<(ApiKey & { role?: Role | null })[]> {
    const apiKeyIds = apiKeys.map((k) => k.id);
    let pivotRows: { apiKeyId: string; roleId: string }[];

    if (scope.tenant === Tenant.AccountProject) {
      const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
      const rows = await this.services.accountProjectApiKeys.getAccountProjectApiKeys({
        accountId,
        projectId,
      });
      pivotRows = rows
        .filter((r) => apiKeyIds.includes(r.apiKeyId))
        .map((r) => ({ apiKeyId: r.apiKeyId, roleId: r.accountRoleId }));
    } else {
      const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
      const rows = await this.services.organizationProjectApiKeys.getOrganizationProjectApiKeys({
        organizationId,
        projectId,
      });
      pivotRows = rows
        .filter((r) => apiKeyIds.includes(r.apiKeyId))
        .map((r) => ({ apiKeyId: r.apiKeyId, roleId: r.organizationRoleId }));
    }

    const roleIds = [...new Set(pivotRows.map((r) => r.roleId))];
    if (roleIds.length === 0) {
      return apiKeys.map((k) => ({ ...k, role: null }));
    }

    const rolesResult = await this.services.roles.getRoles({
      ids: roleIds,
      limit: roleIds.length,
    });
    const roleById = new Map(rolesResult.roles.map((r) => [r.id, r]));
    const roleIdByApiKeyId = new Map(pivotRows.map((r) => [r.apiKeyId, r.roleId]));

    return apiKeys.map((key) => ({
      ...key,
      role: roleById.get(roleIdByApiKeyId.get(key.id) ?? '') ?? null,
    }));
  }

  public async createApiKey(params: MutationCreateApiKeyArgs): Promise<CreateApiKeyResult> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { scope, name, description, expiresAt } = input;
      let { roleId } = input;

      switch (scope.tenant) {
        case Tenant.OrganizationProjectUser:
        case Tenant.AccountProjectUser:
        case Tenant.ProjectUser: {
          const { projectId, userId } = this.extractProjectUserFromScope(scope);
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

        case Tenant.AccountProject: {
          const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
          if (!roleId) {
            roleId = await this.services.accountProjectApiKeys.resolveAccountRoleIdForCurrentUser(
              accountId,
              tx
            );
          }
          const apiKey = await this.services.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );
          await this.services.accountProjectApiKeys.addAccountProjectApiKey(
            {
              accountId,
              projectId,
              apiKeyId: apiKey.id,
              accountRoleId: roleId,
            },
            tx
          );
          this.addApiKeyIdToScopeCache(scope, apiKey.id);
          return apiKey;
        }

        case Tenant.OrganizationProject: {
          if (!roleId) {
            throw new BadRequestError(
              'roleId is required when creating an API key for organizationProject scope',
              'errors:validation.invalid',
              { field: 'roleId' }
            );
          }
          const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
          await this.services.organizationProjectApiKeys.validateOrganizationProjectApiKeyRolePermission(
            organizationId,
            roleId,
            tx
          );
          const apiKey = await this.services.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );
          await this.services.organizationProjectApiKeys.addOrganizationProjectApiKey(
            {
              organizationId,
              projectId,
              apiKeyId: apiKey.id,
              organizationRoleId: roleId,
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
      const { scope, id } = input;
      if (scope.tenant === Tenant.OrganizationProject) {
        const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
        await this.services.organizationProjectApiKeys.validateCanManageOrganizationProjectApiKey(
          organizationId,
          projectId,
          id,
          tx
        );
      }
      const apiKey = await this.services.apiKeys.revokeApiKey(input, tx);
      return apiKey;
    });
  }

  public async deleteApiKey(params: MutationDeleteApiKeyArgs): Promise<ApiKey> {
    return await TransactionManager.withTransaction(this.db, async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      if (scope.tenant === Tenant.OrganizationProject) {
        const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
        await this.services.organizationProjectApiKeys.validateCanManageOrganizationProjectApiKey(
          organizationId,
          projectId,
          id,
          tx
        );
      }
      const apiKey = await this.services.apiKeys.deleteApiKey(
        {
          id,
          hardDelete: input.hardDelete ?? undefined,
        },
        tx
      );
      await this.removeApiKeyIdFromScopeCache(scope, apiKey.id);
      return apiKey;
    });
  }
}
