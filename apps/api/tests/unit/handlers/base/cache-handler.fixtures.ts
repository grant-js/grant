import { Scope, Tenant } from '@grantjs/schema';
import { vi } from 'vitest';

import { CacheHandler, ScopeServices } from '@/handlers/base/cache-handler';

/**
 * Shared fixtures for the CacheHandler characterization suite.
 *
 * The cache namespaces are real in-memory stores rather than bare stubs: several
 * behaviours under test are about what ends up *in* the cache (a miss writes the
 * computed set back, an early return writes nothing), which a stub that always
 * resolves `null` cannot express.
 */

export type CacheNamespace = ReturnType<typeof createCacheNamespace>;

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function createCacheNamespace() {
  const store = new Map<string, unknown>();
  return {
    store,
    get: vi.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    has: vi.fn(async (key: string) => store.has(key)),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
    keys: vi.fn(async (pattern?: string) => {
      const all = [...store.keys()];
      if (!pattern) return all;
      const re = globToRegExp(pattern);
      return all.filter((k) => re.test(k));
    }),
    disconnect: vi.fn(async () => {}),
  };
}

export const CACHE_NAMESPACES = [
  'roles',
  'users',
  'groups',
  'permissions',
  'resources',
  'tags',
  'projects',
  'projectApps',
  'apiKeys',
  'signingKeys',
  'oauth',
  'rateLimit',
] as const;

export type EntityCache = Record<(typeof CACHE_NAMESPACES)[number], CacheNamespace>;

export function createEntityCache(): EntityCache {
  return Object.fromEntries(
    CACHE_NAMESPACES.map((name) => [name, createCacheNamespace()])
  ) as EntityCache;
}

/**
 * Every scopeServices method CacheHandler reaches for, returning the shape it
 * destructures. Ids are derived from the argument so a test can tell which
 * branch produced a result.
 */
export function createScopeServices() {
  return {
    accountProjects: {
      getAccountProjects: vi.fn(async ({ accountId }: { accountId: string }) => [
        { projectId: `proj-of-${accountId}` },
      ]),
    },
    organizationProjects: {
      getOrganizationProjects: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { projectId: `proj-of-${organizationId}` },
      ]),
    },
    organizationRoles: {
      getOrganizationRoles: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { roleId: `role-of-${organizationId}` },
      ]),
    },
    projectRoles: {
      getProjectRoles: vi.fn(async ({ projectId }: { projectId: string }) => [
        { roleId: `role-of-${projectId}` },
      ]),
    },
    userRoles: {
      getUserRoles: vi.fn(async ({ userId }: { userId: string }) => [
        { roleId: `role-of-${userId}` },
      ]),
    },
    organizationUsers: {
      getOrganizationUsers: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { userId: `user-of-${organizationId}` },
      ]),
    },
    projectUsers: {
      getProjectUsers: vi.fn(async ({ projectId }: { projectId: string }) => [
        { userId: `user-of-${projectId}` },
      ]),
    },
    organizationGroups: {
      getOrganizationGroups: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { groupId: `group-of-${organizationId}` },
      ]),
    },
    projectGroups: {
      getProjectGroups: vi.fn(async ({ projectId }: { projectId: string }) => [
        { groupId: `group-of-${projectId}` },
      ]),
    },
    organizationPermissions: {
      getOrganizationPermissions: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { permissionId: `perm-of-${organizationId}` },
      ]),
    },
    projectPermissions: {
      getProjectPermissions: vi.fn(async ({ projectId }: { projectId: string }) => [
        { permissionId: `perm-of-${projectId}` },
      ]),
    },
    projectResources: {
      getProjectResources: vi.fn(async ({ projectId }: { projectId: string }) => [
        { resourceId: `res-of-${projectId}` },
      ]),
    },
    projectApps: {
      getProjectApps: vi.fn(async ({ projectId }: { projectId: string }) => ({
        projectApps: [{ id: `app-of-${projectId}` }],
      })),
    },
    accountTags: {
      getAccountTags: vi.fn(async ({ accountId }: { accountId: string }) => [
        { tagId: `tag-of-${accountId}` },
      ]),
    },
    organizationTags: {
      getOrganizationTags: vi.fn(async ({ organizationId }: { organizationId: string }) => [
        { tagId: `tag-of-${organizationId}` },
      ]),
    },
    projectTags: {
      getProjectTags: vi.fn(async ({ projectId }: { projectId: string }) => [
        { tagId: `tag-of-${projectId}` },
      ]),
    },
    tags: {
      getTags: vi.fn(async ({ ids }: { ids: string[] }) => ({
        tags: ids.map((id) => ({ id, name: id, color: '#000000' })),
      })),
    },
    projectUserApiKeys: {
      getProjectUserApiKeys: vi.fn(
        async ({ projectId, userId }: { projectId: string; userId: string }) => [
          { apiKeyId: `key-of-${projectId}-${userId}` },
        ]
      ),
    },
    accountProjectApiKeys: {
      getAccountProjectApiKeys: vi.fn(
        async ({ accountId, projectId }: { accountId: string; projectId: string }) => [
          { apiKeyId: `key-of-${accountId}-${projectId}` },
        ]
      ),
    },
    organizationProjectApiKeys: {
      getOrganizationProjectApiKeys: vi.fn(
        async ({ organizationId, projectId }: { organizationId: string; projectId: string }) => [
          { apiKeyId: `key-of-${organizationId}-${projectId}` },
        ]
      ),
    },
  };
}

export type FakeScopeServices = ReturnType<typeof createScopeServices>;

export function createCacheHandler(overrides?: { cache?: Partial<EntityCache> }) {
  const cache = { ...createEntityCache(), ...overrides?.cache } as EntityCache;
  const scopeServices = createScopeServices();
  const handler = new CacheHandler(cache as never, scopeServices as unknown as ScopeServices);
  return { handler, cache, scopeServices };
}

/** Total calls recorded across every scopeServices method. */
export function totalServiceCalls(services: FakeScopeServices): number {
  return Object.values(services)
    .flatMap((svc) => Object.values(svc as Record<string, { mock: { calls: unknown[] } }>))
    .reduce((sum, fn) => sum + fn.mock.calls.length, 0);
}

export const cacheKeyFor = (scope: Scope) => `${scope.tenant}:${scope.id}`;

export const scopes = {
  account: { tenant: Tenant.Account, id: 'acc-1' },
  organization: { tenant: Tenant.Organization, id: 'org-1' },
  organizationProject: { tenant: Tenant.OrganizationProject, id: 'org-1:proj-1' },
  accountProject: { tenant: Tenant.AccountProject, id: 'acc-1:proj-1' },
  organizationProjectUser: {
    tenant: Tenant.OrganizationProjectUser,
    id: 'org-1:proj-1:user-1',
  },
  accountProjectUser: { tenant: Tenant.AccountProjectUser, id: 'acc-1:proj-1:user-1' },
  projectUser: { tenant: Tenant.ProjectUser, id: 'proj-1:user-1' },
  system: { tenant: Tenant.System, id: 'system' },
} satisfies Record<string, Scope>;
