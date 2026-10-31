import type {
  IAccountProjectApiKeyService,
  IApiKeyAttenuationService,
  IApiKeyPermissionService,
  IApiKeyService,
  IOrganizationProjectApiKeyService,
  IPermissionService,
  IProjectUserApiKeyService,
  IRoleService,
  ITransactionalConnection,
} from '@grantjs/core';
import {
  ApiKey,
  ApiKeyAttachableGrants,
  ApiKeyPage,
  CreateApiKeyResult,
  ExchangeApiKeyResult,
  MutationCreateApiKeyArgs,
  MutationDeleteApiKeyArgs,
  MutationExchangeApiKeyArgs,
  MutationRevokeApiKeyArgs,
  MutationRotateApiKeyArgs,
  MutationSetApiKeyPermissionsArgs,
  Permission,
  QueryApiKeyAttachableGrantsArgs,
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

type ProjectKeyScope = { tenant: Tenant.AccountProject | Tenant.OrganizationProject; id: string };

type ApiKeyWithGrants = ApiKey & { role?: Role | null; permissions?: Permission[] | null };

function isProjectKeyScope(scope: Scope): scope is ProjectKeyScope {
  return scope.tenant === Tenant.AccountProject || scope.tenant === Tenant.OrganizationProject;
}

export class ApiKeysHandler extends CacheHandler {
  constructor(
    private readonly apiKeys: IApiKeyService,
    private readonly accountProjectApiKeys: IAccountProjectApiKeyService,
    private readonly organizationProjectApiKeys: IOrganizationProjectApiKeyService,
    private readonly projectUserApiKeys: IProjectUserApiKeyService,
    private readonly apiKeyAttenuation: IApiKeyAttenuationService,
    private readonly apiKeyPermissions: IApiKeyPermissionService,
    private readonly roles: IRoleService,
    private readonly permissions: IPermissionService,
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

    if (isProjectKeyScope(scope)) {
      return {
        ...apiKeysResult,
        apiKeys: await this.enrichApiKeysWithGrants(scope, apiKeysResult.apiKeys),
      };
    }

    return apiKeysResult;
  }

  /**
   * Adds what each project key carries: its standard role, or its permissions when it has no
   * role (`role: null`, `permissions: [...]`). Reads one pivot page, one permission page and one
   * role page for the whole list.
   */
  private async enrichApiKeysWithGrants(
    scope: ProjectKeyScope,
    apiKeys: ApiKey[]
  ): Promise<ApiKeyWithGrants[]> {
    const apiKeyIds = new Set(apiKeys.map((k) => k.id));
    let pivotRows: { apiKeyId: string; roleId: string | null }[];

    if (scope.tenant === Tenant.AccountProject) {
      const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
      const rows = await this.accountProjectApiKeys.getAccountProjectApiKeys({
        accountId,
        projectId,
      });
      pivotRows = rows
        .filter((r) => apiKeyIds.has(r.apiKeyId))
        .map((r) => ({ apiKeyId: r.apiKeyId, roleId: r.accountRoleId }));
    } else {
      const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
      const rows = await this.organizationProjectApiKeys.getOrganizationProjectApiKeys({
        organizationId,
        projectId,
      });
      pivotRows = rows
        .filter((r) => apiKeyIds.has(r.apiKeyId))
        .map((r) => ({ apiKeyId: r.apiKeyId, roleId: r.organizationRoleId }));
    }

    const roleIdByApiKeyId = new Map(pivotRows.map((r) => [r.apiKeyId, r.roleId]));
    const roleById = await this.loadRoles(pivotRows.map((r) => r.roleId));

    const permissionKeyIds = pivotRows.filter((r) => r.roleId === null).map((r) => r.apiKeyId);
    const permissionIdsByApiKeyId = await this.apiKeyPermissions.listForKeys(permissionKeyIds);
    const permissionById = await this.loadPermissions([...permissionIdsByApiKeyId.values()].flat());

    return apiKeys.map((key) => {
      const roleId = roleIdByApiKeyId.get(key.id) ?? null;
      const carriesPermissions = roleIdByApiKeyId.has(key.id) && roleId === null;
      return {
        ...key,
        role: roleId ? (roleById.get(roleId) ?? null) : null,
        permissions: carriesPermissions
          ? (permissionIdsByApiKeyId.get(key.id) ?? [])
              .map((id) => permissionById.get(id))
              .filter((permission): permission is Permission => permission !== undefined)
          : null,
      };
    });
  }

  private async loadRoles(roleIds: readonly (string | null)[]): Promise<Map<string, Role>> {
    const ids = [...new Set(roleIds.filter((id): id is string => id !== null))];
    if (ids.length === 0) {
      return new Map();
    }
    const page = await this.roles.getRoles(unboundedList({ ids, limit: -1 }));
    return new Map(page.roles.map((role) => [role.id, role]));
  }

  private async loadPermissions(
    permissionIds: readonly string[]
  ): Promise<Map<string, Permission>> {
    const ids = [...new Set(permissionIds)];
    if (ids.length === 0) {
      return new Map();
    }
    const page = await this.permissions.getPermissions(unboundedList({ ids, limit: -1 }));
    return new Map(page.permissions.map((permission) => [permission.id, permission]));
  }

  /**
   * What the caller may give a new key in this project scope: the permissions (machine-only ones
   * flagged) and the standard roles whose permissions the caller covers.
   */
  public async getAttachableGrants(
    params: QueryApiKeyAttachableGrantsArgs
  ): Promise<ApiKeyAttachableGrants> {
    const { scope } = params;
    const grants = await this.apiKeyAttenuation.attachableGrants(scope);
    const [permissionById, roleById] = await Promise.all([
      this.loadPermissions(grants.permissions.map((entry) => entry.permissionId)),
      this.loadRoles(grants.roleIds),
    ]);

    return {
      permissions: grants.permissions
        .map((entry) => ({
          permission: permissionById.get(entry.permissionId),
          machineOnly: entry.machineOnly,
        }))
        .filter((entry): entry is { permission: Permission; machineOnly: boolean } =>
          Boolean(entry.permission)
        )
        .sort((a, b) => a.permission.name.localeCompare(b.permission.name)),
      roles: grants.roleIds
        .map((id) => roleById.get(id))
        .filter((role): role is Role => role !== undefined),
    };
  }

  public async createApiKey(params: MutationCreateApiKeyArgs): Promise<CreateApiKeyResult> {
    return await this.db.withTransaction(async (tx: Transaction) => {
      const { input } = params;
      const { scope, name, description, expiresAt } = input;
      const permissionIds = input.permissionIds ?? null;
      let { roleId } = input;

      switch (scope.tenant) {
        case Tenant.OrganizationProjectUser:
        case Tenant.AccountProjectUser:
        case Tenant.ProjectUser: {
          if (permissionIds !== null) {
            throw new BadRequestError('permissionIds apply to project API keys only');
          }
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

  /**
   * Replaces the permissions a project key carries; on a role key it converts the key (one
   * way). The editor must cover the key as it is and every permission they add; removals are
   * always allowed. The key's cached authorization results are dropped after the commit.
   */
  public async setApiKeyPermissions(params: MutationSetApiKeyPermissionsArgs): Promise<ApiKey> {
    const { scope, id } = params.input;
    if (!isProjectKeyScope(scope)) {
      throw new BadRequestError('API key permissions can only be changed for a project key');
    }
    const permissionIds = [...new Set(params.input.permissionIds)];
    if (permissionIds.length === 0) {
      throw new BadRequestError('An API key needs at least one permission');
    }

    const apiKey = await this.db.withTransaction(async (tx: Transaction) => {
      const editable = await this.apiKeys.getEditableApiKey({ id }, tx);
      await this.apiKeyAttenuation.assertCanManage({ scope, apiKeyId: id }, tx);

      const roleId = await this.getPivotRoleId(scope, id, tx);
      const before = await this.apiKeyAttenuation.effectivePermissionIdsForKey(
        { scope, apiKeyId: id },
        tx
      );
      const current = new Set(await this.apiKeyPermissions.listForKey(id, tx));
      const additions = permissionIds.filter((permissionId) => !current.has(permissionId));
      if (additions.length > 0) {
        await this.apiKeyAttenuation.assertAttachable({ scope, permissionIds: additions }, tx);
      }

      const { added, removed } = await this.apiKeyPermissions.replace(
        {
          apiKeyId: id,
          projectId: this.getProjectIdOfKeyScope(scope),
          permissionIds,
          fromRoleId: roleId,
        },
        tx
      );
      if (roleId !== null) {
        await this.clearPivotRole(scope, id, tx);
      }

      if (added.length > 0 || removed.length > 0 || roleId !== null) {
        await this.apiKeys.publishApiKeyUpdated(
          {
            apiKey: editable,
            before: { permissionCount: before.length },
            after: { permissionCount: permissionIds.length },
          },
          tx
        );
      }
      return editable;
    });

    await this.invalidateAuthorizationResultsForUser(id);

    const [enriched] = await this.enrichApiKeysWithGrants(scope, [apiKey]);
    return enriched;
  }

  private getProjectIdOfKeyScope(scope: ProjectKeyScope): string {
    return scope.tenant === Tenant.AccountProject
      ? this.extractAccountProjectFromScope(scope).projectId
      : this.extractOrganizationProjectFromScope(scope).projectId;
  }

  private async getPivotRoleId(
    scope: ProjectKeyScope,
    apiKeyId: string,
    tx: Transaction
  ): Promise<string | null> {
    if (scope.tenant === Tenant.AccountProject) {
      const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
      const pivot = await this.accountProjectApiKeys.getByApiKeyAndAccountAndProject(
        apiKeyId,
        accountId,
        projectId,
        tx
      );
      return pivot?.accountRoleId ?? null;
    }
    const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
    const pivot = await this.organizationProjectApiKeys.getByApiKeyAndOrganizationAndProject(
      apiKeyId,
      organizationId,
      projectId,
      tx
    );
    return pivot?.organizationRoleId ?? null;
  }

  private async clearPivotRole(
    scope: ProjectKeyScope,
    apiKeyId: string,
    tx: Transaction
  ): Promise<void> {
    if (scope.tenant === Tenant.AccountProject) {
      const { accountId, projectId } = this.extractAccountProjectFromScope(scope);
      await this.accountProjectApiKeys.clearAccountProjectApiKeyRole(
        { apiKeyId, accountId, projectId },
        tx
      );
      return;
    }
    const { organizationId, projectId } = this.extractOrganizationProjectFromScope(scope);
    await this.organizationProjectApiKeys.clearOrganizationProjectApiKeyRole(
      { apiKeyId, organizationId, projectId },
      tx
    );
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
