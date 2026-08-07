import { Scope } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { cacheKeyFor, createCacheHandler, scopes } from './cache-handler.fixtures';

/**
 * Characterization tests for the nine `getScopedXIds` methods.
 *
 * These record what CacheHandler does *today*, bugs and asymmetries included —
 * they are the correctness check for the slice-5 refactor, which collapses these
 * nine methods into a descriptor table. They must pass unmodified afterwards. If
 * one needs editing to go green, the refactor changed behaviour.
 *
 * This class decides which entity ids a caller is allowed to see, so a mistake
 * here is a cross-tenant leak — the failure mode an e2e suite is least likely to
 * catch, because a leak looks like a successful response.
 */

type Method =
  | 'getScopedProjectIds'
  | 'getScopedRoleIds'
  | 'getScopedUserIds'
  | 'getScopedGroupIds'
  | 'getScopedPermissionIds'
  | 'getScopedResourceIds'
  | 'getScopedTagIds'
  | 'getScopedApiKeyIds';

/** `undefined` means the tenant is rejected with BadRequestError. */
type Expectations = Partial<Record<keyof typeof scopes, string[] | undefined>>;

const matrix: Record<Method, Expectations> = {
  getScopedProjectIds: {
    account: ['proj-of-acc-1'],
    organization: ['proj-of-org-1'],
    organizationProject: ['proj-of-org-1'],
    accountProject: ['proj-of-acc-1'],
    organizationProjectUser: undefined,
    accountProjectUser: undefined,
    projectUser: undefined,
    system: undefined,
  },
  getScopedRoleIds: {
    // Personal accounts hold no account-level roles; these live at project level.
    account: [],
    organization: ['role-of-org-1'],
    organizationProject: ['role-of-proj-1'],
    accountProject: ['role-of-proj-1'],
    organizationProjectUser: ['role-of-proj-1'],
    accountProjectUser: ['role-of-proj-1'],
    // ProjectUser intersects user roles with project roles — see the dedicated
    // describe block below. With the default fixtures the two sets are disjoint.
    projectUser: [],
    system: undefined,
  },
  getScopedUserIds: {
    account: [],
    organization: ['user-of-org-1'],
    organizationProject: ['user-of-proj-1'],
    accountProject: ['user-of-proj-1'],
    organizationProjectUser: ['user-of-proj-1'],
    accountProjectUser: ['user-of-proj-1'],
    projectUser: undefined,
    system: undefined,
  },
  getScopedGroupIds: {
    account: [],
    organization: ['group-of-org-1'],
    organizationProject: ['group-of-proj-1'],
    accountProject: ['group-of-proj-1'],
    organizationProjectUser: ['group-of-proj-1'],
    accountProjectUser: ['group-of-proj-1'],
    projectUser: undefined,
    system: undefined,
  },
  getScopedPermissionIds: {
    account: [],
    organization: ['perm-of-org-1'],
    organizationProject: ['perm-of-proj-1'],
    accountProject: ['perm-of-proj-1'],
    organizationProjectUser: ['perm-of-proj-1'],
    accountProjectUser: ['perm-of-proj-1'],
    projectUser: undefined,
    system: undefined,
  },
  getScopedResourceIds: {
    // Resources are project-level only — every non-project tenant is rejected.
    account: undefined,
    organization: undefined,
    organizationProject: ['res-of-proj-1'],
    accountProject: ['res-of-proj-1'],
    organizationProjectUser: ['res-of-proj-1'],
    accountProjectUser: ['res-of-proj-1'],
    projectUser: undefined,
    system: undefined,
  },
  getScopedTagIds: {
    // Unlike roles/users/groups/permissions, an Account scope returns real tags.
    account: ['tag-of-acc-1'],
    organization: ['tag-of-org-1'],
    organizationProject: ['tag-of-proj-1'],
    accountProject: ['tag-of-proj-1'],
    organizationProjectUser: ['tag-of-proj-1'],
    accountProjectUser: ['tag-of-proj-1'],
    projectUser: undefined,
    system: undefined,
  },
  getScopedApiKeyIds: {
    account: undefined,
    organization: undefined,
    organizationProject: ['key-of-org-1-proj-1'],
    accountProject: ['key-of-acc-1-proj-1'],
    organizationProjectUser: ['key-of-proj-1-user-1'],
    accountProjectUser: ['key-of-proj-1-user-1'],
    projectUser: ['key-of-proj-1-user-1'],
    system: undefined,
  },
};

describe('CacheHandler tenant dispatch', () => {
  for (const [method, expectations] of Object.entries(matrix) as [Method, Expectations][]) {
    describe(method, () => {
      for (const [scopeName, expected] of Object.entries(expectations) as [
        keyof typeof scopes,
        string[] | undefined,
      ][]) {
        const scope = scopes[scopeName] as Scope;

        if (expected === undefined) {
          it(`rejects ${scopeName}`, async () => {
            const { handler } = createCacheHandler();
            await expect(handler[method](scope)).rejects.toThrow(/Unsupported tenant type/);
          });
          continue;
        }

        it(`resolves ${scopeName} to [${expected.join(', ')}]`, async () => {
          const { handler } = createCacheHandler();
          await expect(handler[method](scope)).resolves.toEqual(expected);
        });
      }
    });
  }
});

describe('CacheHandler cache semantics', () => {
  const namespaceFor: Record<Method, string> = {
    getScopedProjectIds: 'projects',
    getScopedRoleIds: 'roles',
    getScopedUserIds: 'users',
    getScopedGroupIds: 'groups',
    getScopedPermissionIds: 'permissions',
    getScopedResourceIds: 'resources',
    getScopedTagIds: 'tags',
    getScopedApiKeyIds: 'apiKeys',
  };

  // One representative supported scope per method.
  const supported: Record<Method, keyof typeof scopes> = {
    getScopedProjectIds: 'organization',
    getScopedRoleIds: 'organization',
    getScopedUserIds: 'organization',
    getScopedGroupIds: 'organization',
    getScopedPermissionIds: 'organization',
    getScopedResourceIds: 'organizationProject',
    getScopedTagIds: 'organization',
    getScopedApiKeyIds: 'organizationProject',
  };

  for (const method of Object.keys(namespaceFor) as Method[]) {
    const ns = namespaceFor[method];
    const scope = scopes[supported[method]] as Scope;

    it(`${method} writes the computed set to cache.${ns} on a miss`, async () => {
      const { handler, cache } = createCacheHandler();
      const result = await handler[method](scope);

      expect(cache[ns as keyof typeof cache].set).toHaveBeenCalledWith(
        cacheKeyFor(scope),
        new Set(result)
      );
      expect(cache[ns as keyof typeof cache].store.get(cacheKeyFor(scope))).toEqual(
        new Set(result)
      );
    });

    it(`${method} returns the cached set on a hit without consulting any service`, async () => {
      const { handler, cache, scopeServices } = createCacheHandler();
      cache[ns as keyof typeof cache].store.set(cacheKeyFor(scope), new Set(['cached-id']));

      await expect(handler[method](scope)).resolves.toEqual(['cached-id']);

      const calls = Object.values(scopeServices)
        .flatMap((svc) => Object.values(svc as Record<string, { mock: { calls: unknown[] } }>))
        .reduce((sum, fn) => sum + fn.mock.calls.length, 0);
      expect(calls).toBe(0);
    });
  }
});

describe('getScopedRoleIds ProjectUser intersection', () => {
  /**
   * The subtlest branch in the file: a ProjectUser scope returns roles the user
   * holds AND the project offers. Order follows the *project* role list, not the
   * user's.
   */
  const scope = scopes.projectUser as Scope;

  it('returns only roles present in both sets', async () => {
    const { handler, scopeServices } = createCacheHandler();
    scopeServices.userRoles.getUserRoles.mockResolvedValue([
      { roleId: 'shared-a' },
      { roleId: 'user-only' },
      { roleId: 'shared-b' },
    ] as never);
    scopeServices.projectRoles.getProjectRoles.mockResolvedValue([
      { roleId: 'shared-b' },
      { roleId: 'project-only' },
      { roleId: 'shared-a' },
    ] as never);

    await expect(handler.getScopedRoleIds(scope)).resolves.toEqual(['shared-b', 'shared-a']);
  });

  it('returns [] when the user holds none of the project roles', async () => {
    const { handler, scopeServices } = createCacheHandler();
    scopeServices.userRoles.getUserRoles.mockResolvedValue([{ roleId: 'user-only' }] as never);
    scopeServices.projectRoles.getProjectRoles.mockResolvedValue([
      { roleId: 'project-only' },
    ] as never);

    await expect(handler.getScopedRoleIds(scope)).resolves.toEqual([]);
  });

  it('parses ProjectUser ids as projectId:userId, not the 3-part composite form', async () => {
    const { handler, scopeServices } = createCacheHandler();
    await handler.getScopedRoleIds(scope);

    expect(scopeServices.projectRoles.getProjectRoles).toHaveBeenCalledWith({
      projectId: 'proj-1',
    });
    expect(scopeServices.userRoles.getUserRoles).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});

describe('getScopedProjectAppIds', () => {
  const scope = scopes.organizationProject as Scope;

  it('returns the project apps when the project is inside the scope', async () => {
    const { handler, scopeServices } = createCacheHandler();
    // The default fixture resolves org-1 to `proj-of-org-1`, which would fail the
    // guard, so the scoped project list has to name proj-1 explicitly.
    scopeServices.organizationProjects.getOrganizationProjects.mockResolvedValue([
      { projectId: 'proj-1' },
    ] as never);

    await expect(handler.getScopedProjectAppIds(scope)).resolves.toEqual(['app-of-proj-1']);
  });

  it('returns [] when the scoped projects do not contain the requested project', async () => {
    const { handler, scopeServices } = createCacheHandler();
    scopeServices.organizationProjects.getOrganizationProjects.mockResolvedValue([
      { projectId: 'some-other-project' },
    ] as never);

    await expect(handler.getScopedProjectAppIds(scope)).resolves.toEqual([]);
    expect(scopeServices.projectApps.getProjectApps).not.toHaveBeenCalled();
  });

  it('does not cache the empty result, so the guard is re-evaluated next call', async () => {
    const { handler, cache, scopeServices } = createCacheHandler();
    scopeServices.organizationProjects.getOrganizationProjects.mockResolvedValue([
      { projectId: 'some-other-project' },
    ] as never);

    await handler.getScopedProjectAppIds(scope);

    expect(cache.projectApps.set).not.toHaveBeenCalled();
    expect(cache.projectApps.store.size).toBe(0);
  });

  it('requests every project app rather than a page', async () => {
    const { handler, scopeServices } = createCacheHandler();
    scopeServices.organizationProjects.getOrganizationProjects.mockResolvedValue([
      { projectId: 'proj-1' },
    ] as never);

    await handler.getScopedProjectAppIds(scope);

    expect(scopeServices.projectApps.getProjectApps).toHaveBeenCalledWith({
      projectId: 'proj-1',
      page: 1,
      limit: -1,
    });
  });
});

describe('composite scope id parsing', () => {
  it('reads projectId from position 1 for both 2-part and 3-part ids', async () => {
    const { handler, scopeServices } = createCacheHandler();

    await handler.getScopedUserIds(scopes.accountProject as Scope);
    expect(scopeServices.projectUsers.getProjectUsers).toHaveBeenCalledWith({
      projectId: 'proj-1',
    });

    scopeServices.projectUsers.getProjectUsers.mockClear();
    await handler.getScopedUserIds(scopes.accountProjectUser as Scope);
    expect(scopeServices.projectUsers.getProjectUsers).toHaveBeenCalledWith({
      projectId: 'proj-1',
    });
  });

  it('rejects a composite id missing its second segment', async () => {
    const { handler } = createCacheHandler();
    await expect(
      handler.getScopedUserIds({ tenant: scopes.accountProject.tenant, id: 'acc-1' } as Scope)
    ).rejects.toThrow(/accountId:projectId/);
  });

  it('resolves an OrganizationProject scope to the organization, not the project', async () => {
    // getScopedProjectIds returns every project of the owning organization —
    // not just the one named in the scope id.
    const { handler, scopeServices } = createCacheHandler();
    scopeServices.organizationProjects.getOrganizationProjects.mockResolvedValue([
      { projectId: 'proj-1' },
      { projectId: 'proj-2' },
    ] as never);

    await expect(handler.getScopedProjectIds(scopes.organizationProject as Scope)).resolves.toEqual(
      ['proj-1', 'proj-2']
    );
    expect(scopeServices.organizationProjects.getOrganizationProjects).toHaveBeenCalledWith({
      organizationId: 'org-1',
    });
  });
});

describe('getScopedApiKeyIds tolerates a missing apiKeys cache', () => {
  it('computes ids without caching when the adapter is absent', async () => {
    const { handler } = createCacheHandler({ cache: { apiKeys: undefined as never } });

    await expect(handler.getScopedApiKeyIds(scopes.projectUser as Scope)).resolves.toEqual([
      'key-of-proj-1-user-1',
    ]);
  });
});

describe('fixture isolation', () => {
  // Guards the suite itself: the cache namespaces are real stores, so a leak
  // between handlers would make a "cache hit" assertion pass for the wrong reason.
  it('each createCacheHandler call starts with empty caches', async () => {
    const first = createCacheHandler();
    await first.handler.getScopedRoleIds(scopes.organization as Scope);
    expect(first.cache.roles.store.size).toBe(1);

    const second = createCacheHandler();
    expect(second.cache.roles.store.size).toBe(0);
  });
});
