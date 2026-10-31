import type {
  IAccountProjectApiKeyService,
  IApiKeyAttenuationService,
  IApiKeyPermissionService,
  IApiKeyService,
  IOrganizationProjectApiKeyService,
  IProjectUserApiKeyService,
  IRoleService,
  ITransactionalConnection,
} from '@grantjs/core';
import {
  ApiKey,
  ApiKeyPage,
  CreateApiKeyResult,
  ExchangeApiKeyResult,
  MutationCreateApiKeyArgs,
  MutationDeleteApiKeyArgs,
  MutationExchangeApiKeyArgs,
  MutationRevokeApiKeyArgs,
  MutationRotateApiKeyArgs,
  QueryApiKeysArgs,
  Role,
  Scope,
  Tenant,
} from '@grantjs/schema';

import { IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import { unboundedList } from '@/lib/pagination.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { SelectedFields } from '@/types';

import { CacheHandler, type ScopeServices } from './base/cache-handler';

/**
 * `permissionIds` is accepted here for a key that carries permissions instead of a role; no
 * transport passes it yet.
 */
type CreateApiKeyParams = Omit<MutationCreateApiKeyArgs, 'input'> & {
  input: MutationCreateApiKeyArgs['input'] & { permissionIds?: string[] | null };
};

export class ApiKeysHandler extends CacheHandler {
  constructor(
    private readonly apiKeys: IApiKeyService,
    private readonly accountProjectApiKeys: IAccountProjectApiKeyService,
    private readonly organizationProjectApiKeys: IOrganizationProjectApiKeyService,
    private readonly projectUserApiKeys: IProjectUserApiKeyService,
    private readonly apiKeyAttenuation: IApiKeyAttenuationService,
    private readonly apiKeyPermissions: IApiKeyPermissionService,
    private readonly roles: IRoleService,
    cache: IEntityCacheAdapter,
    scopeServices: ScopeServices,
    private readonly db: ITransactionalConnection<Transaction>
  ) {
    super(cache, scopeServices);
  }

  public async getApiKeys(params: QueryApiKeysArgs & SelectedFields<ApiKey>): Promise<ApiKeyPage> {
    const { scope, page, limit, sort, search, ids, requestedFields } = params;

    const apiKeysResult = await this.apiKeys.getApiKeys({
      scope,
      ids,
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
    let pivotRows: { apiKeyId: string; roleId: string | null }[];

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

    const roleIds = [
      ...new Set(pivotRows.map((r) => r.roleId).filter((id): id is string => id !== null)),
    ];
    if (roleIds.length === 0) {
      return apiKeys.map((k) => ({ ...k, role: null }));
    }

    const rolesResult = await this.roles.getRoles(
      unboundedList({
        ids: roleIds,
        limit: -1,
      })
    );
    const roleById = new Map(rolesResult.roles.map((r) => [r.id, r]));
    const roleIdByApiKeyId = new Map(pivotRows.map((r) => [r.apiKeyId, r.roleId]));

    return apiKeys.map((key) => ({
      ...key,
      role: roleById.get(roleIdByApiKeyId.get(key.id) ?? '') ?? null,
    }));
  }

  public async createApiKey(params: CreateApiKeyParams): Promise<CreateApiKeyResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, name, description, expiresAt } = input;
      const permissionIds = input.permissionIds ?? null;
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
              owner: { projectId, userId },
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

          await this.addApiKeyIdToScopeCache(scope, apiKey.id);
          return apiKey;
        }

        case Tenant.AccountProject: {
          const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
          if (!roleId && permissionIds === null) {
            roleId = await this.accountProjectApiKeys.resolveAccountRoleIdForCurrentUser(
              accountId,
              tx
            );
          }
          await this.apiKeyAttenuation.assertAttachable({ scope, roleId, permissionIds }, tx);
          const apiKey = await this.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              grant: this.describeGrant(roleId, permissionIds),
            },
            tx
          );
          await this.accountProjectApiKeys.addAccountProjectApiKey(
            {
              accountId,
              projectId,
              apiKeyId: apiKey.id,
              accountRoleId: roleId ?? null,
            },
            tx
          );
          await this.attachPermissions(apiKey.id, projectId, permissionIds, tx);
          await this.addApiKeyIdToScopeCache(scope, apiKey.id);
          return apiKey;
        }

        case Tenant.OrganizationProject: {
          if (!roleId && permissionIds === null) {
            throw new BadRequestError(
              'roleId is required when creating an API key for organizationProject scope'
            );
          }
          const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
          await this.apiKeyAttenuation.assertAttachable({ scope, roleId, permissionIds }, tx);
          const apiKey = await this.apiKeys.createApiKey(
            {
              name: name ?? undefined,
              description: description ?? undefined,
              expiresAt: expiresAt ? new Date(expiresAt) : null,
              grant: this.describeGrant(roleId, permissionIds),
            },
            tx
          );
          await this.organizationProjectApiKeys.addOrganizationProjectApiKey(
            {
              organizationId,
              projectId,
              apiKeyId: apiKey.id,
              organizationRoleId: roleId ?? null,
            },
            tx
          );
          await this.attachPermissions(apiKey.id, projectId, permissionIds, tx);
          await this.addApiKeyIdToScopeCache(scope, apiKey.id);
          return apiKey;
        }

        default:
          throw new BadRequestError(`Unsupported tenant type: ${scope.tenant}`);
      }
    });
  }

  private describeGrant(
    roleId: string | null | undefined,
    permissionIds: string[] | null
  ): { kind: 'role' | 'permissions'; permissionCount: number } {
    return roleId
      ? { kind: 'role', permissionCount: 0 }
      : { kind: 'permissions', permissionCount: new Set(permissionIds ?? []).size };
  }

  private async attachPermissions(
    apiKeyId: string,
    projectId: string,
    permissionIds: string[] | null,
    tx: Transaction
  ): Promise<void> {
    if (permissionIds !== null) {
      await this.apiKeyPermissions.attach({ apiKeyId, projectId, permissionIds }, tx);
    }
  }

  /** A project key may only be changed by a caller whose permissions cover the key's. */
  private async assertCanManage(scope: Scope, apiKeyId: string, tx: Transaction): Promise<void> {
    if (scope.tenant === Tenant.OrganizationProject || scope.tenant === Tenant.AccountProject) {
      await this.apiKeyAttenuation.assertCanManage({ scope, apiKeyId }, tx);
    }
  }

  public async exchangeApiKey(
    params: MutationExchangeApiKeyArgs,
    requestBaseUrl?: string
  ): Promise<ExchangeApiKeyResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      return await this.apiKeys.exchangeApiKeyForToken(input, tx, requestBaseUrl);
    });
  }

  public async revokeApiKey(params: MutationRevokeApiKeyArgs): Promise<ApiKey> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      await this.assertCanManage(scope, id, tx);
      const apiKey = await this.apiKeys.revokeApiKey(input, tx);
      return apiKey;
    });
  }

  public async rotateApiKey(params: MutationRotateApiKeyArgs): Promise<CreateApiKeyResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      await this.assertCanManage(scope, id, tx);
      return await this.apiKeys.rotateApiKey({ id }, tx);
    });
  }

  public async deleteApiKey(params: MutationDeleteApiKeyArgs): Promise<ApiKey> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, id } = input;
      await this.assertCanManage(scope, id, tx);
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
