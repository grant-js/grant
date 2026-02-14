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
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

import type {
  IAccountProjectApiKeyService,
  IApiKeyService,
  IOrganizationProjectApiKeyService,
  IProjectUserApiKeyService,
  IRoleService,
  ITransactionalConnection,
} from '@grantjs/core';

export class ApiKeysHandler extends CacheHandler {
  constructor(
    private readonly apiKeys: IApiKeyService,
    private readonly accountProjectApiKeys: IAccountProjectApiKeyService,
    private readonly organizationProjectApiKeys: IOrganizationProjectApiKeyService,
    private readonly projectUserApiKeys: IProjectUserApiKeyService,
    private readonly roles: IRoleService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
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

    const apiKeysResult = await this.apiKeys.getApiKeys({
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
      const rows = await this.accountProjectApiKeys.getAccountProjectApiKeys({
        accountId,
        projectId,
      });
      pivotRows = rows
        .filter((r) => apiKeyIds.includes(r.apiKeyId))
        .map((r) => ({ apiKeyId: r.apiKeyId, roleId: r.accountRoleId }));
    } else {
      const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
      const rows = await this.organizationProjectApiKeys.getOrganizationProjectApiKeys({
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

    const rolesResult = await this.roles.getRoles({
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
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, name, description, expiresAt } = input;
      let { roleId } = input;

      switch (scope.tenant) {
        case Tenant.OrganizationProjectUser:
        case Tenant.AccountProjectUser:
        case Tenant.ProjectUser: {
          const { projectId, userId } = this.extractProjectUserFromScope(scope);
          const apiKey = await this.apiKeys.createApiKey(
            {
              name,
              description,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );

          await this.projectUserApiKeys.addProjectUserApiKey(
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
            roleId = await this.accountProjectApiKeys.resolveAccountRoleIdForCurrentUser(
              accountId,
              tx
            );
          }
          const apiKey = await this.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );
          await this.accountProjectApiKeys.addAccountProjectApiKey(
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
              'roleId is required when creating an API key for organizationProject scope'
            );
          }
          const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
          await this.organizationProjectApiKeys.validateOrganizationProjectApiKeyRolePermission(
            organizationId,
            roleId,
            tx
          );
          const apiKey = await this.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
            },
            tx
          );
          await this.organizationProjectApiKeys.addOrganizationProjectApiKey(
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
          throw new BadRequestError(`Unsupported tenant type: ${scope.tenant}`);
      }
    });
  }

  public async exchangeApiKey(params: MutationExchangeApiKeyArgs): Promise<ExchangeApiKeyResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      return await this.apiKeys.exchangeApiKeyForToken(input, tx);
    });
  }

  public async revokeApiKey(params: MutationRevokeApiKeyArgs): Promise<ApiKey> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      if (scope.tenant === Tenant.OrganizationProject) {
        const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
        await this.organizationProjectApiKeys.validateCanManageOrganizationProjectApiKey(
          organizationId,
          projectId,
          id,
          tx
        );
      }
      const apiKey = await this.apiKeys.revokeApiKey(input, tx);
      return apiKey;
    });
  }

  public async deleteApiKey(params: MutationDeleteApiKeyArgs): Promise<ApiKey> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      if (scope.tenant === Tenant.OrganizationProject) {
        const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
        await this.organizationProjectApiKeys.validateCanManageOrganizationProjectApiKey(
          organizationId,
          projectId,
          id,
          tx
        );
      }
      const apiKey = await this.apiKeys.deleteApiKey(
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
