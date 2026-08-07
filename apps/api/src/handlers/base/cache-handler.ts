import type {
  IAccountProjectApiKeyService,
  IAccountProjectService,
  IAccountTagService,
  IOrganizationGroupService,
  IOrganizationPermissionService,
  IOrganizationProjectApiKeyService,
  IOrganizationProjectService,
  IOrganizationRoleService,
  IOrganizationTagService,
  IOrganizationUserService,
  IProjectAppService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectRoleService,
  IProjectTagService,
  IProjectUserApiKeyService,
  IProjectUserService,
  IScopedIdProvider,
  ITagService,
  IUserRoleService,
} from '@grantjs/core';
import { AuthorizationResult, Scope, Tag, Tenant } from '@grantjs/schema';
import { createHash } from 'crypto';

import { AUTH_RESULT_CACHE_KEY_PREFIX } from '@/constants/cache.constants';
import { CacheKey, ICacheAdapter, IEntityCacheAdapter } from '@/lib/cache';
import { BadRequestError } from '@/lib/errors';
import {
  accountProjectFromScopeOrThrow,
  organizationProjectFromScopeOrThrow,
  projectIdFromScopeOrThrow,
  projectUserFromScopeOrThrow,
} from '@/lib/scope.lib';

/**
 * Narrow subset of Services used by CacheHandler for scope-resolution.
 * Defined using port interfaces from @grantjs/core instead of the concrete
 * Services bag, fully decoupling the handler base class from implementations.
 */
export interface ScopeServices {
  accountProjects: IAccountProjectService;
  organizationProjects: IOrganizationProjectService;
  organizationRoles: IOrganizationRoleService;
  projectRoles: IProjectRoleService;
  userRoles: IUserRoleService;
  organizationUsers: IOrganizationUserService;
  projectUsers: IProjectUserService;
  organizationGroups: IOrganizationGroupService;
  projectGroups: IProjectGroupService;
  organizationPermissions: IOrganizationPermissionService;
  projectPermissions: IProjectPermissionService;
  projectResources: IProjectResourceService;
  projectApps: IProjectAppService;
  accountTags: IAccountTagService;
  organizationTags: IOrganizationTagService;
  projectTags: IProjectTagService;
  tags: ITagService;
  projectUserApiKeys: IProjectUserApiKeyService;
  accountProjectApiKeys: IAccountProjectApiKeyService;
  organizationProjectApiKeys: IOrganizationProjectApiKeyService;
}

type ScopedTagPivot = {
  tagId: string;
  isPrimary?: boolean | null;
};

type ScopedTagHydration = {
  tagsByOwnerId: Map<string, Tag[]>;
  primaryTagByOwnerId: Map<string, Tag | null>;
  tagCountByOwnerId: Map<string, number>;
};

/** Cache namespaces that hold a scope -> id-set mapping. */
type ScopedIdKind =
  'projects' | 'roles' | 'users' | 'groups' | 'permissions' | 'resources' | 'tags' | 'apiKeys';

type ScopeResolver = (scope: Scope) => Promise<string[]>;

type ScopedIdDescriptor = {
  /**
   * A tenant absent from this map is rejected, never silently empty.
   *
   * Built with a null prototype. `scope.tenant` is attacker-controlled — every
   * path in `scope-extractor.ts` casts it out of a header, query param or body
   * without checking it against the enum — so a plain object literal would
   * resolve `toString` and friends off `Object.prototype`, skip the rejection
   * below, and call them. See `assertResolvable`.
   */
  byTenant: Partial<Record<Tenant, ScopeResolver>>;
  unsupportedMessage?: (tenant: Tenant) => string;
};

/**
 * Own-property lookup for a tenant resolver.
 *
 * The `Object.hasOwn` guard and the null-prototype maps are belt and braces on
 * purpose: either alone closes the hole, and this dispatch decides which entity
 * ids a caller may see, so it does not get to depend on one of them staying
 * correct through a later edit.
 */
const resolverFor = (
  byTenant: Partial<Record<Tenant, ScopeResolver>>,
  tenant: Tenant
): ScopeResolver | undefined => (Object.hasOwn(byTenant, tenant) ? byTenant[tenant] : undefined);

const tenantMap = (
  entries: Partial<Record<Tenant, ScopeResolver>>
): Partial<Record<Tenant, ScopeResolver>> => Object.assign(Object.create(null), entries);

/** The four tenants whose scope id embeds a projectId at index 1. */
const PROJECT_SCOPED_TENANTS = [
  Tenant.OrganizationProject,
  Tenant.AccountProject,
  Tenant.OrganizationProjectUser,
  Tenant.AccountProjectUser,
] as const;

/** The three tenants whose scope id embeds both a projectId and a userId. */
const PROJECT_USER_TENANTS = [
  Tenant.ProjectUser,
  Tenant.AccountProjectUser,
  Tenant.OrganizationProjectUser,
] as const;

const forTenants = (
  tenants: readonly Tenant[],
  resolve: ScopeResolver
): Partial<Record<Tenant, ScopeResolver>> =>
  Object.assign(Object.create(null), Object.fromEntries(tenants.map((t) => [t, resolve])));

export class CacheHandler implements IScopedIdProvider {
  private readonly scopedIdDescriptors: Record<ScopedIdKind, ScopedIdDescriptor>;

  constructor(
    protected cache: IEntityCacheAdapter,
    protected readonly scopeServices: ScopeServices
  ) {
    this.scopedIdDescriptors = this.buildScopedIdDescriptors();
  }

  // Scope-id parsing lives in @/lib/scope.lib; these stay as protected members
  // because subclasses call them.
  protected extractProjectIdFromScope = projectIdFromScopeOrThrow;
  protected extractProjectUserFromScope = projectUserFromScopeOrThrow;
  protected extractAccountProjectFromScope = accountProjectFromScopeOrThrow;
  protected extractOrganizationProjectFromScope = organizationProjectFromScopeOrThrow;

  private createCacheKey(scope: Scope): CacheKey {
    return `${scope.tenant}:${scope.id}`;
  }

  private async addIdToCache(cacheAdapter: ICacheAdapter, scope: Scope, id: string): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    const exists = await cacheAdapter.has(cacheKey);

    if (exists) {
      const idsSet = await cacheAdapter.get(cacheKey);
      if (idsSet && !idsSet.has(id)) {
        idsSet.add(id);
        await cacheAdapter.set(cacheKey, idsSet);
      }
    }
  }

  private async removeIdFromCache(
    cacheAdapter: ICacheAdapter,
    scope: Scope,
    id: string
  ): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    const exists = await cacheAdapter.has(cacheKey);

    if (exists) {
      const idsSet = await cacheAdapter.get(cacheKey);
      if (idsSet && idsSet.has(id)) {
        idsSet.delete(id);
        await cacheAdapter.set(cacheKey, idsSet);
      }
    }
  }

  /**
   * Reads one scoped-id set: cache hit wins, otherwise the tenant's resolver
   * computes the set and the result is written back.
   *
   * `adapter` is optional-chained because `cache.apiKeys` may be absent; for
   * every other namespace it is always present.
   */
  private async resolveScopedIds(kind: ScopedIdKind, scope: Scope): Promise<string[]> {
    const descriptor = this.scopedIdDescriptors[kind];
    // The record key *is* the cache namespace. It used to be repeated as a
    // `namespace` field with nothing tying the two together, so a descriptor
    // could read and write another entity's id set under the same cache key.
    const adapter: ICacheAdapter | undefined = this.cache[kind];
    const cacheKey = this.createCacheKey(scope);

    const cached = await adapter?.get(cacheKey);
    if (cached) {
      return Array.from(cached.values());
    }

    const resolve = resolverFor(descriptor.byTenant, scope.tenant);
    if (!resolve) {
      throw new BadRequestError(
        descriptor.unsupportedMessage?.(scope.tenant) ?? `Unsupported tenant type: ${scope.tenant}`
      );
    }

    const ids = await resolve(scope);
    await adapter?.set(cacheKey, new Set(ids));
    return ids;
  }

  /**
   * One entry per scoped-id kind. Built in the constructor because the resolvers
   * close over `scopeServices`.
   *
   * Read this table as the authorization surface it is: for a given entity and
   * tenant, which service decides the visible id set. A tenant absent from a
   * `byTenant` map is rejected, not silently empty — except where a resolver
   * explicitly returns `[]`, which is a deliberate "this tenancy level has none
   * of these" and is marked as such.
   */
  private buildScopedIdDescriptors(): Record<ScopedIdKind, ScopedIdDescriptor> {
    const s = this.scopeServices;

    // Personal accounts have no account-level roles, users, groups or
    // permissions; those exist only at project level.
    const noneAtAccountLevel = async () => [];

    const projectScoped =
      <T>(fetch: (projectId: string) => Promise<T[]>, pick: (row: T) => string): ScopeResolver =>
      async (scope) =>
        (await fetch(projectIdFromScopeOrThrow(scope))).map(pick);

    return {
      projects: {
        byTenant: tenantMap({
          [Tenant.Account]: async (scope) =>
            (await s.accountProjects.getAccountProjects({ accountId: scope.id })).map(
              (ap) => ap.projectId
            ),
          [Tenant.Organization]: async (scope) =>
            (
              await s.organizationProjects.getOrganizationProjects({ organizationId: scope.id })
            ).map((op) => op.projectId),
          // A project-level scope resolves to every project of the owning
          // account/organization, not only the one named in the scope id.
          [Tenant.AccountProject]: async (scope) =>
            (
              await s.accountProjects.getAccountProjects({
                accountId: accountProjectFromScopeOrThrow(scope).accountId,
              })
            ).map((ap) => ap.projectId),
          [Tenant.OrganizationProject]: async (scope) =>
            (
              await s.organizationProjects.getOrganizationProjects({
                organizationId: organizationProjectFromScopeOrThrow(scope).organizationId,
              })
            ).map((op) => op.projectId),
        }),
      },

      roles: {
        byTenant: tenantMap({
          [Tenant.Account]: noneAtAccountLevel,
          [Tenant.Organization]: async (scope) =>
            (await s.organizationRoles.getOrganizationRoles({ organizationId: scope.id })).map(
              (or) => or.roleId
            ),
          ...forTenants(
            PROJECT_SCOPED_TENANTS,
            projectScoped(
              (projectId) => s.projectRoles.getProjectRoles({ projectId }),
              (pr) => pr.roleId
            )
          ),
          // Roles the user holds AND the project offers. Order follows the
          // project list. Dropping either side of this filter is a privilege
          // escalation, so it stays explicit rather than folded into a helper.
          [Tenant.ProjectUser]: async (scope) => {
            const { projectId, userId } = projectUserFromScopeOrThrow(scope);
            const [userRoles, projectRoles] = await Promise.all([
              s.userRoles.getUserRoles({ userId }),
              s.projectRoles.getProjectRoles({ projectId }),
            ]);
            const userRoleIds = new Set(userRoles.map((ur) => ur.roleId));
            return projectRoles.map((pr) => pr.roleId).filter((roleId) => userRoleIds.has(roleId));
          },
        }),
      },

      users: {
        byTenant: tenantMap({
          [Tenant.Account]: noneAtAccountLevel,
          [Tenant.Organization]: async (scope) =>
            (await s.organizationUsers.getOrganizationUsers({ organizationId: scope.id })).map(
              (ou) => ou.userId
            ),
          ...forTenants(
            PROJECT_SCOPED_TENANTS,
            projectScoped(
              (projectId) => s.projectUsers.getProjectUsers({ projectId }),
              (pu) => pu.userId
            )
          ),
        }),
      },

      groups: {
        byTenant: tenantMap({
          [Tenant.Account]: noneAtAccountLevel,
          [Tenant.Organization]: async (scope) =>
            (await s.organizationGroups.getOrganizationGroups({ organizationId: scope.id })).map(
              (og) => og.groupId
            ),
          ...forTenants(
            PROJECT_SCOPED_TENANTS,
            projectScoped(
              (projectId) => s.projectGroups.getProjectGroups({ projectId }),
              (pg) => pg.groupId
            )
          ),
        }),
      },

      permissions: {
        byTenant: tenantMap({
          [Tenant.Account]: noneAtAccountLevel,
          [Tenant.Organization]: async (scope) =>
            (
              await s.organizationPermissions.getOrganizationPermissions({
                organizationId: scope.id,
              })
            ).map((op) => op.permissionId),
          ...forTenants(
            PROJECT_SCOPED_TENANTS,
            projectScoped(
              (projectId) => s.projectPermissions.getProjectPermissions({ projectId }),
              (pp) => pp.permissionId
            )
          ),
        }),
      },

      resources: {
        unsupportedMessage: (tenant) =>
          `Unsupported tenant type: ${tenant}. Resources are only supported at the project level.`,
        byTenant: forTenants(
          PROJECT_SCOPED_TENANTS,
          projectScoped(
            (projectId) => s.projectResources.getProjectResources({ projectId }),
            (pr) => pr.resourceId
          )
        ),
      },

      // Unlike roles/users/groups/permissions, an Account scope resolves to real
      // tags — personal accounts do carry account-level tags.
      tags: {
        byTenant: tenantMap({
          [Tenant.Account]: async (scope) =>
            (await s.accountTags.getAccountTags({ accountId: scope.id })).map((at) => at.tagId),
          [Tenant.Organization]: async (scope) =>
            (await s.organizationTags.getOrganizationTags({ organizationId: scope.id })).map(
              (ot) => ot.tagId
            ),
          ...forTenants(
            PROJECT_SCOPED_TENANTS,
            projectScoped(
              (projectId) => s.projectTags.getProjectTags({ projectId }),
              (pt) => pt.tagId
            )
          ),
        }),
      },

      apiKeys: {
        byTenant: tenantMap({
          ...forTenants(PROJECT_USER_TENANTS, async (scope) => {
            const { projectId, userId } = projectUserFromScopeOrThrow(scope);
            return (await s.projectUserApiKeys.getProjectUserApiKeys({ projectId, userId })).map(
              (pivot) => pivot.apiKeyId
            );
          }),
          [Tenant.AccountProject]: async (scope) => {
            const { accountId, projectId } = accountProjectFromScopeOrThrow(scope);
            return (
              await s.accountProjectApiKeys.getAccountProjectApiKeys({ accountId, projectId })
            ).map((pivot) => pivot.apiKeyId);
          },
          [Tenant.OrganizationProject]: async (scope) => {
            const { organizationId, projectId } = organizationProjectFromScopeOrThrow(scope);
            return (
              await s.organizationProjectApiKeys.getOrganizationProjectApiKeys({
                organizationId,
                projectId,
              })
            ).map((pivot) => pivot.apiKeyId);
          },
        }),
      },
    };
  }

  getScopedProjectIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('projects', scope);
  }

  getScopedRoleIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('roles', scope);
  }

  getScopedUserIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('users', scope);
  }

  getScopedGroupIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('groups', scope);
  }

  getScopedPermissionIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('permissions', scope);
  }

  getScopedResourceIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('resources', scope);
  }

  getScopedTagIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('tags', scope);
  }

  getScopedApiKeyIds(scope: Scope): Promise<string[]> {
    return this.resolveScopedIds('apiKeys', scope);
  }

  async getScopedProjectAppIds(scope: Scope): Promise<string[]> {
    const cacheKey = this.createCacheKey(scope);

    const cachedProjectApps = await this.cache.projectApps.get(cacheKey);
    if (cachedProjectApps) {
      return Array.from(cachedProjectApps.values());
    }

    const projectId = this.extractProjectIdFromScope(scope);
    const projectIds = await this.getScopedProjectIds(scope);
    if (!projectIds.includes(projectId)) {
      return [];
    }

    const page = await this.scopeServices.projectApps.getProjectApps({
      projectId,
      page: 1,
      limit: -1,
    });
    const projectAppIds = page.projectApps.map((app) => app.id);
    await this.cache.projectApps.set(cacheKey, new Set(projectAppIds));
    return projectAppIds;
  }

  // Incremental scope-cache maintenance. Both underlying helpers are no-ops when
  // the scope has no cached set: there is nothing to keep in sync, and the next
  // read recomputes from the services. Writing a singleton set here would
  // present a partial set as authoritative.
  async addTagIdToScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.addIdToCache(this.cache.tags, scope, tagId);
  }

  async removeTagIdFromScopeCache(scope: Scope, tagId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.tags, scope, tagId);
  }

  async addRoleIdToScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.addIdToCache(this.cache.roles, scope, roleId);
  }

  async removeRoleIdFromScopeCache(scope: Scope, roleId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.roles, scope, roleId);
  }

  async addUserIdToScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.addIdToCache(this.cache.users, scope, userId);
  }

  async removeUserIdFromScopeCache(scope: Scope, userId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.users, scope, userId);
  }

  async addGroupIdToScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.addIdToCache(this.cache.groups, scope, groupId);
  }

  async removeGroupIdFromScopeCache(scope: Scope, groupId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.groups, scope, groupId);
  }

  async addPermissionIdToScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.addIdToCache(this.cache.permissions, scope, permissionId);
  }

  async removePermissionIdFromScopeCache(scope: Scope, permissionId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.permissions, scope, permissionId);
  }

  async addResourceIdToScopeCache(scope: Scope, resourceId: string): Promise<void> {
    await this.addIdToCache(this.cache.resources, scope, resourceId);
  }

  async removeResourceIdFromScopeCache(scope: Scope, resourceId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.resources, scope, resourceId);
  }

  async addProjectIdToScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.addIdToCache(this.cache.projects, scope, projectId);
  }

  async removeProjectIdFromScopeCache(scope: Scope, projectId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.projects, scope, projectId);
  }

  async addProjectAppIdToScopeCache(scope: Scope, projectAppId: string): Promise<void> {
    await this.addIdToCache(this.cache.projectApps, scope, projectAppId);
  }

  async removeProjectAppIdFromScopeCache(scope: Scope, projectAppId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.projectApps, scope, projectAppId);
  }

  async addApiKeyIdToScopeCache(scope: Scope, apiKeyId: string): Promise<void> {
    await this.addIdToCache(this.cache.apiKeys, scope, apiKeyId);
  }

  async removeApiKeyIdFromScopeCache(scope: Scope, apiKeyId: string): Promise<void> {
    await this.removeIdFromCache(this.cache.apiKeys, scope, apiKeyId);
  }

  protected async hydrateScopedTagsForOwners<TPivot extends ScopedTagPivot>(params: {
    scope: Scope;
    ownerIds: string[];
    pivots: TPivot[];
    getOwnerId: (pivot: TPivot) => string;
  }): Promise<ScopedTagHydration> {
    const { scope, ownerIds, pivots, getOwnerId } = params;
    const tagsByOwnerId = new Map<string, Tag[]>(ownerIds.map((ownerId) => [ownerId, []]));
    const primaryTagByOwnerId = new Map<string, Tag | null>(
      ownerIds.map((ownerId) => [ownerId, null])
    );
    const tagCountByOwnerId = new Map<string, number>(ownerIds.map((ownerId) => [ownerId, 0]));

    if (ownerIds.length === 0 || pivots.length === 0) {
      return { tagsByOwnerId, primaryTagByOwnerId, tagCountByOwnerId };
    }

    const ownerIdSet = new Set(ownerIds);
    const scopedTagIds = new Set(await this.getScopedTagIds(scope));
    const scopedPivots = pivots.filter((pivot) => {
      return ownerIdSet.has(getOwnerId(pivot)) && scopedTagIds.has(pivot.tagId);
    });

    if (scopedPivots.length === 0) {
      return { tagsByOwnerId, primaryTagByOwnerId, tagCountByOwnerId };
    }

    const tagIds = [...new Set(scopedPivots.map((pivot) => pivot.tagId))];
    const { tags } = await this.scopeServices.tags.getTags({ ids: tagIds, limit: -1 });
    const tagsById = new Map(tags.map((tag) => [tag.id, tag]));

    for (const pivot of scopedPivots) {
      const ownerId = getOwnerId(pivot);
      const tag = tagsById.get(pivot.tagId);
      if (!tag) {
        continue;
      }

      const hydratedTag = { ...tag, isPrimary: pivot.isPrimary ?? false };
      tagsByOwnerId.get(ownerId)?.push(hydratedTag);
      tagCountByOwnerId.set(ownerId, (tagCountByOwnerId.get(ownerId) ?? 0) + 1);

      if (hydratedTag.isPrimary && !primaryTagByOwnerId.get(ownerId)) {
        primaryTagByOwnerId.set(ownerId, hydratedTag);
      }
    }

    return { tagsByOwnerId, primaryTagByOwnerId, tagCountByOwnerId };
  }

  async invalidatePermissionsCacheForAllScopes(): Promise<void> {
    await this.cache.permissions.clear();
  }

  /**
   * Builds cache key for authorization results. For project-app tokens, include a signature of
   * grantedScopes so different OAuth grants (different consented scopes) do not share cache entries.
   */
  protected getAuthorizationCacheKey(
    userId: string,
    scope: Scope,
    permission: { resource: string; action: string },
    context?: { resource?: Record<string, unknown> | null },
    grantedScopes?: string[]
  ): string {
    const contextHash = context?.resource
      ? createHash('sha512').update(JSON.stringify(context.resource)).digest('hex').substring(0, 8)
      : 'none';
    const resourceNorm = permission.resource.trim().toLowerCase();
    const actionNorm = permission.action.trim().toLowerCase();
    const scopePart = `${scope.tenant}:${scope.id}`;
    const grantedPart =
      grantedScopes && grantedScopes.length > 0
        ? createHash('sha512')
            .update(
              [...grantedScopes]
                .map((s) => (s ?? '').trim().toLowerCase())
                .sort()
                .join(',')
            )
            .digest('hex')
            .substring(0, 16)
        : '';
    const key = grantedPart
      ? `${AUTH_RESULT_CACHE_KEY_PREFIX}${userId}:${scopePart}:${grantedPart}:${resourceNorm}:${actionNorm}:${contextHash}`
      : `${AUTH_RESULT_CACHE_KEY_PREFIX}${userId}:${scopePart}:${resourceNorm}:${actionNorm}:${contextHash}`;
    return key;
  }

  protected async getAuthorizationResult<T = AuthorizationResult>(
    cacheKey: string
  ): Promise<T | null> {
    return this.cache.permissions.get<T>(cacheKey);
  }

  protected async setAuthorizationResult<T = AuthorizationResult>(
    cacheKey: string,
    result: T,
    ttlSeconds?: number
  ): Promise<void> {
    await this.cache.permissions.set(cacheKey, result, ttlSeconds);
  }

  async invalidateRolesCacheForScope(scope: Scope): Promise<void> {
    const cacheKey = this.createCacheKey(scope);
    await this.cache.roles.delete(cacheKey);
  }

  /**
   * Clears cached authorization results for a user (prefix match). Call when
   * inputs that affect permission condition evaluation change (e.g. project
   * membership metadata).
   */
  protected async invalidateAuthorizationResultsForUser(userId: string): Promise<void> {
    const pattern = `${AUTH_RESULT_CACHE_KEY_PREFIX}${userId}:*`;
    const keys = await this.cache.permissions.keys(pattern);
    for (const key of keys) {
      await this.cache.permissions.delete(key);
    }
  }

  /**
   * Signing keys are stored per-kid under the scope key, so this clears by
   * prefix. The prefix is not delimiter-anchored: `organization:org-1*` also
   * matches `organization:org-10`. That over-invalidates across organizations,
   * which costs a recompute rather than leaking anything, and is characterized
   * as current behaviour — narrowing it is a behaviour change, not a refactor.
   */
  async invalidateSigningKeysCacheForScope(scope: Scope): Promise<void> {
    const keysToDelete = await this.cache.signingKeys.keys(`${this.createCacheKey(scope)}*`);
    for (const key of keysToDelete) {
      await this.cache.signingKeys.delete(key);
    }
  }
}
