import type {
  CdmApplyContext,
  CdmPermissionRefSpec,
  CdmProducedRefs,
  IApiKeyService,
  ICdmEntityHandler,
  IGroupPermissionService,
  IGroupService,
  IGroupTagService,
  IPermissionService,
  IPermissionTagService,
  IProjectGroupService,
  IProjectImportService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectRolePermissionService,
  IProjectRoleService,
  IProjectTagService,
  IProjectUserApiKeyService,
  IProjectUserGroupService,
  IProjectUserPermissionService,
  IProjectUserService,
  IResourceService,
  IResourceTagService,
  IRoleGroupService,
  IRolePermissionService,
  IRoleService,
  IRoleTagService,
  ITagService,
  IUserAuthenticationMethodService,
  IUserGroupService,
  IUserPermissionService,
  IUserRepository,
  IUserRoleService,
  IUserService,
  IUserTagService,
} from '@grantjs/core';
import {
  CdmModeStrategy,
  PermissionCdmInput,
  ResourceCdmInput,
  Scope,
  SyncProjectInput,
  SyncProjectResult,
  Tenant,
} from '@grantjs/schema';

import { AUTH_RESULT_CACHE_KEY_PREFIX } from '@/constants/cache.constants';
import type { IEntityCacheAdapter } from '@/lib/cache';
import {
  createDefaultCdmEntities,
  expandCdmSyncInput,
  refDedupKey,
  resolveAllPermissionRefs,
  validateCdmJsonFields,
} from '@/lib/cdm';
import type { ExpandedCdmSyncPayload } from '@/lib/cdm/expand-cdm-sync-input.lib';
import { ConfigurationError, ConflictError, ValidationError } from '@/lib/errors';
import { runWithEventSuppression } from '@/lib/events';
import { Transaction } from '@/lib/transaction-manager.lib';
import { ProjectExportRepository } from '@/repositories/project-export.repository';
import {
  ProjectImportRepository,
  ResolvedCdmPermission,
} from '@/repositories/project-import.repository';

export class ProjectImportService implements IProjectImportService {
  private readonly importRepo: ProjectImportRepository;
  private readonly cache: IEntityCacheAdapter;
  private readonly handlers: ReadonlyArray<ICdmEntityHandler>;
  private readonly resourceTags: IResourceTagService;
  private readonly permissionTags: IPermissionTagService;
  private readonly projectUsers: IProjectUserService;

  constructor(
    importRepo: ProjectImportRepository,
    roles: IRoleService,
    groups: IGroupService,
    roleGroups: IRoleGroupService,
    rolePermissions: IRolePermissionService,
    groupPermissions: IGroupPermissionService,
    userPermissions: IUserPermissionService,
    userGroups: IUserGroupService,
    projectRoles: IProjectRoleService,
    projectGroups: IProjectGroupService,
    projectPermissions: IProjectPermissionService,
    projectRolePermissions: IProjectRolePermissionService,
    projectUserPermissions: IProjectUserPermissionService,
    projectUserGroups: IProjectUserGroupService,
    projectResources: IProjectResourceService,
    projectUsers: IProjectUserService,
    userRoles: IUserRoleService,
    apiKeys: IApiKeyService,
    projectUserApiKeys: IProjectUserApiKeyService,
    cache: IEntityCacheAdapter,
    tags: ITagService,
    projectTags: IProjectTagService,
    roleTags: IRoleTagService,
    groupTags: IGroupTagService,
    userTags: IUserTagService,
    resources: IResourceService,
    permissions: IPermissionService,
    users: IUserService,
    userAuthenticationMethods: IUserAuthenticationMethodService,
    userRepository: IUserRepository,
    resourceTags: IResourceTagService,
    permissionTags: IPermissionTagService,
    /**
     * Read-side repo used by handlers' `export(...)` to enumerate prior
     * project state. Optional because the sync flow itself only needs the
     * registry's `apply`/`teardown`; if omitted, calls into `handler.export`
     * will fail with a missing-dependency error at use-time.
     *
     * Tests that exercise sync only (e.g. metadata round-trip) can omit this
     * argument and pass a stub via {@link handlers} to avoid wiring it.
     */
    exportRepo?: ProjectExportRepository,
    /**
     * Optional explicit handler registry. When provided, all CDM concerns are
     * delegated to this list; otherwise the default registry is built from the
     * injected services. Useful to add new handlers in tests or to swap a
     * single handler with a mock.
     */
    handlers?: ReadonlyArray<ICdmEntityHandler>
  ) {
    this.importRepo = importRepo;
    this.cache = cache;
    this.resourceTags = resourceTags;
    this.permissionTags = permissionTags;
    this.projectUsers = projectUsers;
    this.handlers =
      handlers ??
      createDefaultCdmEntities({
        importRepo,
        exportRepo: exportRepo ?? createUnboundExportRepo(),
        roles,
        groups,
        roleGroups,
        rolePermissions,
        groupPermissions,
        userPermissions,
        userGroups,
        projectRoles,
        projectGroups,
        projectPermissions,
        projectRolePermissions,
        projectUserPermissions,
        projectUserGroups,
        projectResources,
        projectUsers,
        userRoles,
        apiKeys,
        projectUserApiKeys,
        tags,
        projectTags,
        roleTags,
        groupTags,
        userTags,
        resources,
        permissions,
        users,
        userAuthenticationMethods,
        userRepository,
      });
  }

  /**
   * Post-commit cache invalidation for a successful sync. Mirrors what the
   * legacy synchronous handler used to do; lives on the service so the async
   * worker can call it without depending on transport-layer handlers.
   */
  public async invalidateCachesForImportResult(params: {
    scope: Scope;
    userIds: string[];
  }): Promise<void> {
    const cacheKey = `${params.scope.tenant}:${params.scope.id}`;
    await this.invalidateEntityCachesForScopeKey(cacheKey);

    const projectId = this.projectIdFromAccountOrOrgProjectScope(params.scope);
    const memberUserIds =
      projectId != null && projectId !== ''
        ? (await this.projectUsers.getProjectUsers({ projectId })).map((m) => m.userId)
        : [];
    const userIdsForCompositeCaches = new Set([...params.userIds, ...memberUserIds]);

    for (const userId of userIdsForCompositeCaches) {
      for (const relatedKey of this.projectUserRelatedScopeCacheKeys(params.scope, userId)) {
        await this.invalidateEntityCachesForScopeKey(relatedKey);
      }
    }

    for (const userId of params.userIds) {
      const pattern = `${AUTH_RESULT_CACHE_KEY_PREFIX}${userId}:*`;
      const keys = await this.cache.permissions.keys(pattern);
      for (const key of keys) {
        await this.cache.permissions.delete(key);
      }
    }
  }

  private projectIdFromAccountOrOrgProjectScope(scope: Scope): string | null {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      return null;
    }
    const parts = scope.id.split(':');
    return parts[1] ?? null;
  }

  /**
   * {@link CacheHandler.createCacheKey} is `${tenant}:${scope.id}`. CDM jobs
   * run under {@link Tenant.AccountProject} / {@link Tenant.OrganizationProject},
   * but list/detail UIs often query under {@link Tenant.AccountProjectUser} /
   * {@link Tenant.OrganizationProjectUser} or {@link Tenant.ProjectUser}. Those
   * caches must be cleared too or `getScopedApiKeyIds` keeps stale api key ids.
   */
  private projectUserRelatedScopeCacheKeys(scope: Scope, userId: string): string[] {
    const keys: string[] = [];
    const parts = scope.id.split(':');
    if (scope.tenant === Tenant.AccountProject) {
      const accountId = parts[0];
      const projectIdPart = parts[1];
      if (accountId && projectIdPart && userId) {
        keys.push(`${Tenant.AccountProjectUser}:${accountId}:${projectIdPart}:${userId}`);
        keys.push(`${Tenant.ProjectUser}:${projectIdPart}:${userId}`);
      }
    } else if (scope.tenant === Tenant.OrganizationProject) {
      const organizationId = parts[0];
      const projectIdPart = parts[1];
      if (organizationId && projectIdPart && userId) {
        keys.push(`${Tenant.OrganizationProjectUser}:${organizationId}:${projectIdPart}:${userId}`);
        keys.push(`${Tenant.ProjectUser}:${projectIdPart}:${userId}`);
      }
    }
    return keys;
  }

  private async invalidateEntityCachesForScopeKey(cacheKey: string): Promise<void> {
    await Promise.all([
      this.cache.permissions.delete(cacheKey),
      this.cache.roles.delete(cacheKey),
      this.cache.groups.delete(cacheKey),
      this.cache.users.delete(cacheKey),
      this.cache.resources.delete(cacheKey),
      this.cache.tags.delete(cacheKey),
      this.cache.apiKeys.delete(cacheKey),
    ]);
  }

  public async importProjectCdm(
    params: {
      projectId: string;
      scope: Scope;
      input: SyncProjectInput;
    },
    transaction: unknown
  ): Promise<SyncProjectResult> {
    return runWithEventSuppression(() => this.applyProjectCdmImport(params, transaction));
  }

  private async applyProjectCdmImport(
    params: {
      projectId: string;
      scope: Scope;
      input: SyncProjectInput;
    },
    transaction: unknown
  ): Promise<SyncProjectResult> {
    const tx = transaction as Transaction;
    const { projectId, scope, input } = params;
    this.assertProjectScope(scope);
    const scopeProjectId = this.projectIdFromScope(scope);
    if (scopeProjectId !== projectId) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    const expanded = expandCdmSyncInput(input);
    if (expanded.version !== 1) {
      throw new ValidationError('Unsupported version; only 1 is allowed');
    }

    // Before the per-entity handlers: they read `condition`/`metadata` through
    // `as Record<string, unknown>`, which only holds once this has run.
    validateCdmJsonFields(expanded);

    for (const handler of this.handlers) {
      const slice = this.sliceForHandler(expanded, handler);
      handler.validateInput(slice);
    }

    this.validateCdmUserReferences(expanded);

    if (expanded.mode?.strategy === CdmModeStrategy.Replace) {
      const existingCdmProjectUserApiKeyIds =
        await this.importRepo.listCdmProjectUserApiKeyIdsForProject(projectId, tx);
      const incomingProjectUserApiKeyCount = expanded.projectUserApiKeys?.length ?? 0;
      if (existingCdmProjectUserApiKeyIds.length > 0 && incomingProjectUserApiKeyCount === 0) {
        throw new ValidationError(
          'Replace CDM sync would delete all CDM-managed project user API keys without creating replacements. ' +
            'The document has no users[].apiKeys entries with a BYOK clientSecret (exported JSON omits secrets). ' +
            'Merge each key’s clientSecret into the document before importing, or remove existing keys first if you intend to clear them.'
        );
      }
    }

    const allRefs: CdmPermissionRefSpec[] = [];
    for (const handler of this.handlers) {
      const slice = this.sliceForHandler(expanded, handler);
      const refs = handler.collectPermissionRefs(slice);
      for (const r of refs) allRefs.push(r);
    }
    const resolvedByKey = await resolveAllPermissionRefs(this.importRepo, allRefs, tx);

    const result: SyncProjectResult = {
      projectId,
      importId: expanded.id ?? null,
      rolesCreated: 0,
      groupsCreated: 0,
      roleGroupsLinked: 0,
      groupPermissionsLinked: 0,
      projectRolesLinked: 0,
      projectGroupsLinked: 0,
      projectPermissionsLinked: 0,
      projectResourcesLinked: 0,
      projectUsersEnsured: 0,
      usersCreated: 0,
      userRolesAssigned: 0,
      projectUserApiKeysCreated: 0,
      tagsCreated: 0,
      projectTagsLinked: 0,
      roleTagsLinked: 0,
      groupTagsLinked: 0,
      userTagsLinked: 0,
      resourcesCreated: 0,
      permissionsCreated: 0,
      warnings: [...expanded.warnings],
    };

    const produced: CdmProducedRefs = {
      roleIdsByKey: new Map<string, string>(),
      tagIds: new Map<string, string>(),
      resourceIds: new Map<string, string>(),
      permissionIds: new Map<string, string>(),
      userIds: new Map<string, string>(),
      groupIdsByKey: new Map<string, string>(),
    };

    const documentGroupsByKey = new Map(
      (expanded.groups ?? [])
        .filter((g) => typeof g.key === 'string' && g.key.trim() !== '')
        .map((g) => [g.key.trim(), g])
    );

    if (expanded.mode?.strategy === CdmModeStrategy.Replace) {
      if (expanded.mode.confirmDestructive !== true) {
        throw new ValidationError(
          'mode.confirmDestructive must be true when mode.strategy is replace'
        );
      }
      this.importRepo.resetStaggerSoftDeleteEpoch();
      for (const handler of this.handlers) {
        await handler.teardown({ projectId, scope, tx });
      }
    }

    const assignmentUserIds = new Set<string>();
    for (const ua of expanded.userAssignments ?? []) {
      if (ua.userId != null && ua.userId !== '') {
        assignmentUserIds.add(ua.userId);
      }
    }

    const applyCtx: CdmApplyContext = {
      projectId,
      scope,
      tx,
      lookupResolvedRef: (ref) => this.lookupRef(ref, resolvedByKey, produced),
      result,
      produced,
      documentGroupsByKey,
      assignmentUserIds,
    };

    for (const handler of this.handlers) {
      const slice = this.sliceForHandler(expanded, handler);
      await handler.apply(applyCtx, slice);
    }

    await this.linkResourceAndPermissionTagPivots(expanded, applyCtx, tx);

    return result;
  }

  private async linkResourceAndPermissionTagPivots(
    expanded: ExpandedCdmSyncPayload,
    ctx: CdmApplyContext,
    tx: Transaction
  ): Promise<void> {
    const { produced } = ctx;
    for (const row of expanded.resources) {
      const r = row as ResourceCdmInput;
      const key = r.key?.trim() ?? '';
      const resourceId = produced.resourceIds.get(key);
      if (!resourceId) continue;
      const tagKeys = (r.tags ?? []).filter(
        (t): t is string => typeof t === 'string' && t.trim() !== ''
      );
      for (const tagKey of tagKeys) {
        const tk = tagKey.trim();
        const tagId = produced.tagIds.get(tk);
        if (!tagId) {
          throw new ValidationError(`resources[${key}]: unknown tagKey '${tk}'`);
        }
        const isPrimary = tk === (r.primaryTag?.trim() ?? '');
        try {
          await this.resourceTags.addResourceTag({ resourceId, tagId, isPrimary }, tx);
        } catch (e) {
          if (!(e instanceof ConflictError)) throw e;
        }
      }
    }
    for (const row of expanded.permissions) {
      const p = row as PermissionCdmInput;
      const key = p.key?.trim() ?? '';
      const permissionId = produced.permissionIds.get(key);
      if (!permissionId) continue;
      const tagKeys = (p.tags ?? []).filter(
        (t): t is string => typeof t === 'string' && t.trim() !== ''
      );
      for (const tagKey of tagKeys) {
        const tk = tagKey.trim();
        const tagId = produced.tagIds.get(tk);
        if (!tagId) {
          throw new ValidationError(`permissions[${key}]: unknown tagKey '${tk}'`);
        }
        const isPrimary = tk === (p.primaryTag?.trim() ?? '');
        try {
          await this.permissionTags.addPermissionTag({ permissionId, tagId, isPrimary }, tx);
        } catch (e) {
          if (!(e instanceof ConflictError)) throw e;
        }
      }
    }
  }

  private sliceForHandler(
    expanded: ExpandedCdmSyncPayload,
    handler: ICdmEntityHandler
  ): readonly unknown[] {
    const value = (expanded as unknown as Record<string, unknown>)[handler.inputKey];
    return Array.isArray(value) ? (value as readonly unknown[]) : [];
  }

  private lookupRef(
    ref: CdmPermissionRefSpec,
    resolved: Map<string, ResolvedCdmPermission>,
    produced: CdmProducedRefs
  ): ResolvedCdmPermission {
    if (ref.permissionKey != null && ref.permissionKey !== '') {
      const id = produced.permissionIds.get(ref.permissionKey);
      if (id) {
        return { id, resourceId: null };
      }
      throw new ValidationError(
        `permissionKey "${ref.permissionKey}" did not match any permission in the CDM document`
      );
    }
    const key = refDedupKey(ref);
    const v = resolved.get(key);
    if (!v) {
      throw new ValidationError('Internal: missing resolved permission for ref');
    }
    return v;
  }

  private assertProjectScope(scope: Scope): void {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'importProjectCdm requires accountProject or organizationProject scope'
      );
    }
  }

  private projectIdFromScope(scope: Scope): string {
    const parts = scope.id.split(':');
    return parts[1] ?? '';
  }

  /**
   * Cross-field validation for expanded user assignments and API keys vs provisioned users.
   */
  private validateCdmUserReferences(expanded: ExpandedCdmSyncPayload): void {
    const provisionKeys = new Set(expanded.provisionedUsers.map((p) => p.externalKey));
    const assignmentSeen = new Set<string>();
    for (const ua of expanded.userAssignments ?? []) {
      const hasUid = ua.userId != null && ua.userId !== '';
      const hasKey = ua.userKey != null && ua.userKey !== '';
      if (hasUid === hasKey) {
        throw new ValidationError(
          'Each user entry requires exactly one of key.findBy id or a provision key'
        );
      }
      if (hasKey && !provisionKeys.has(ua.userKey!)) {
        throw new ValidationError(
          `users: unknown provision key '${ua.userKey}'; must match another user's key when not using id lookup`
        );
      }
      const dedupe = hasUid ? ua.userId! : `key:${ua.userKey}`;
      if (assignmentSeen.has(dedupe)) {
        throw new ValidationError(`Duplicate user entry for ${dedupe}`);
      }
      assignmentSeen.add(dedupe);
      if (ua.primaryUserTagKey != null && ua.primaryUserTagKey !== '') {
        const tags = ua.tagKeys ?? [];
        if (!tags.includes(ua.primaryUserTagKey)) {
          throw new ValidationError(
            `users: primaryTag '${ua.primaryUserTagKey}' must appear in tags`
          );
        }
      }
    }

    for (const row of expanded.projectUserApiKeys ?? []) {
      const hasUid = row.userId != null && row.userId !== '';
      const hasKey = row.userKey != null && row.userKey !== '';
      if (hasUid === hasKey) {
        throw new ValidationError(
          'Each apiKeys entry requires exactly one of userId or userKey on the parent user'
        );
      }
      if (hasKey && !provisionKeys.has(row.userKey!)) {
        throw new ValidationError(
          `apiKeys: unknown userKey '${row.userKey}'; parent user must be provisioned in the same document`
        );
      }
    }
  }
}

/**
 * Sentinel export repository used when callers construct the sync service
 * without wiring the read-side join repo. Every method throws — handlers'
 * `export(...)` paths surface a clear missing-dependency error instead of
 * silently using `undefined.db`.
 */
function createUnboundExportRepo(): ProjectExportRepository {
  const fail = () => {
    throw new ConfigurationError(
      'ProjectExportRepository was not provided to ProjectImportService; export(...) is unavailable in this configuration.'
    );
  };
  return new Proxy(Object.create(null) as ProjectExportRepository, {
    get: () => fail,
  });
}
