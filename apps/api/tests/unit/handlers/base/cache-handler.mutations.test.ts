import { Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { AUTH_RESULT_CACHE_KEY_PREFIX } from '@/constants/cache.constants';
import { CacheHandler, ScopeServices } from '@/handlers/base/cache-handler';

import {
  cacheKeyFor,
  createCacheHandler,
  createEntityCache,
  createScopeServices,
  EntityCache,
  scopes,
} from './cache-handler.fixtures';

/**
 * Characterization tests for the scope-cache mutators and invalidators.
 *
 * As with the scoped-id suite, these record current behaviour so the slice-5
 * refactor — which collapses the 18 add/remove wrappers onto one generic — can
 * be checked against them unmodified.
 */

/** Exposes the protected members slice 5 also touches. */
class ProbeHandler extends CacheHandler {
  publicAuthCacheKey(...args: Parameters<CacheHandler['getAuthorizationCacheKey']>) {
    return this.getAuthorizationCacheKey(...args);
  }
  publicInvalidateAuthResults(userId: string) {
    return this.invalidateAuthorizationResultsForUser(userId);
  }
  publicGetAuthResult(key: string) {
    return this.getAuthorizationResult(key);
  }
  publicSetAuthResult(key: string, result: unknown, ttl?: number) {
    return this.setAuthorizationResult(key, result, ttl);
  }
}

function createProbe() {
  const cache = createEntityCache();
  const handler = new ProbeHandler(
    cache as never,
    createScopeServices() as unknown as ScopeServices
  );
  return { handler, cache };
}

const scope = scopes.organization as Scope;
const key = cacheKeyFor(scope);

/** wrapper name -> [namespace, sample id] */
const wrappers = {
  Tag: ['tags', 'tag-1'],
  Role: ['roles', 'role-1'],
  User: ['users', 'user-1'],
  Group: ['groups', 'group-1'],
  Permission: ['permissions', 'perm-1'],
  Resource: ['resources', 'res-1'],
  Project: ['projects', 'proj-1'],
  ProjectApp: ['projectApps', 'app-1'],
  ApiKey: ['apiKeys', 'key-1'],
} as const satisfies Record<string, readonly [keyof EntityCache, string]>;

describe('scope-cache add/remove wrappers', () => {
  for (const [entity, [ns, id]] of Object.entries(wrappers) as [
    keyof typeof wrappers,
    [keyof EntityCache, string],
  ][]) {
    const add = `add${entity}IdToScopeCache` as const;
    const remove = `remove${entity}IdFromScopeCache` as const;

    it(`${add} writes into cache.${ns}`, async () => {
      const { handler, cache } = createCacheHandler();
      cache[ns].store.set(key, new Set(['existing']));

      await (handler[add] as (s: Scope, i: string) => Promise<void>)(scope, id);

      expect(cache[ns].store.get(key)).toEqual(new Set(['existing', id]));
    });

    it(`${remove} deletes from cache.${ns}`, async () => {
      const { handler, cache } = createCacheHandler();
      cache[ns].store.set(key, new Set(['existing', id]));

      await (handler[remove] as (s: Scope, i: string) => Promise<void>)(scope, id);

      expect(cache[ns].store.get(key)).toEqual(new Set(['existing']));
    });

    it(`${add} is a no-op when the scope has no cached set`, async () => {
      const { handler, cache } = createCacheHandler();

      await (handler[add] as (s: Scope, i: string) => Promise<void>)(scope, id);

      // Deliberate: with no cached set there is nothing to keep in sync, and the
      // next read recomputes from the services. Writing a singleton set here
      // would present a partial set as authoritative.
      expect(cache[ns].store.has(key)).toBe(false);
      expect(cache[ns].set).not.toHaveBeenCalled();
    });

    it(`${remove} is a no-op when the scope has no cached set`, async () => {
      const { handler, cache } = createCacheHandler();

      await (handler[remove] as (s: Scope, i: string) => Promise<void>)(scope, id);

      expect(cache[ns].store.has(key)).toBe(false);
      expect(cache[ns].set).not.toHaveBeenCalled();
    });

    it(`${add} does not rewrite the set when the id is already present`, async () => {
      const { handler, cache } = createCacheHandler();
      cache[ns].store.set(key, new Set([id]));

      await (handler[add] as (s: Scope, i: string) => Promise<void>)(scope, id);

      expect(cache[ns].set).not.toHaveBeenCalled();
    });

    it(`${remove} does not rewrite the set when the id is absent`, async () => {
      const { handler, cache } = createCacheHandler();
      cache[ns].store.set(key, new Set(['other']));

      await (handler[remove] as (s: Scope, i: string) => Promise<void>)(scope, id);

      expect(cache[ns].set).not.toHaveBeenCalled();
    });
  }

  it('touches only the namespace it names', async () => {
    const { handler, cache } = createCacheHandler();
    for (const [ns] of Object.values(wrappers)) cache[ns].store.set(key, new Set(['seed']));

    await handler.addRoleIdToScopeCache(scope, 'role-9');

    expect(cache.roles.store.get(key)).toEqual(new Set(['seed', 'role-9']));
    for (const [ns] of Object.values(wrappers)) {
      if (ns === 'roles') continue;
      expect(cache[ns].store.get(key)).toEqual(new Set(['seed']));
    }
  });
});

describe('invalidators', () => {
  const otherScopeKey = cacheKeyFor({ tenant: Tenant.Organization, id: 'org-other' } as Scope);

  it('invalidateRolesCacheForScope deletes just that scope key', async () => {
    const { handler, cache } = createCacheHandler();
    cache.roles.store.set(key, new Set(['a']));
    cache.roles.store.set(otherScopeKey, new Set(['b']));

    await handler.invalidateRolesCacheForScope(scope);

    expect(cache.roles.store.has(key)).toBe(false);
    expect(cache.roles.store.has(otherScopeKey)).toBe(true);
  });

  it('invalidatePermissionsCacheForAllScopes clears the whole namespace', async () => {
    const { handler, cache } = createCacheHandler();
    cache.permissions.store.set(key, new Set(['a']));
    cache.permissions.store.set(otherScopeKey, new Set(['b']));

    await handler.invalidatePermissionsCacheForAllScopes();

    expect(cache.permissions.store.size).toBe(0);
  });

  it('invalidateSigningKeysCacheForScope deletes by prefix, not exact key', async () => {
    const { handler, cache } = createCacheHandler();
    cache.signingKeys.store.set(key, 'a');
    cache.signingKeys.store.set(`${key}:kid-1`, 'b');
    cache.signingKeys.store.set(`${key}:kid-2`, 'c');
    cache.signingKeys.store.set(`${otherScopeKey}:kid-1`, 'd');

    await handler.invalidateSigningKeysCacheForScope(scope);

    expect([...cache.signingKeys.store.keys()]).toEqual([`${otherScopeKey}:kid-1`]);
  });

  it('invalidateSigningKeysCacheForScope prefix is not delimiter-anchored', async () => {
    // `organization:org-1*` also matches `organization:org-10`, a different
    // organization. Recorded as current behaviour, not endorsed — slice 5 revisits
    // this method, and collapsing it must not silently change the blast radius.
    const { handler, cache } = createCacheHandler();
    cache.signingKeys.store.set(key, 'a');
    cache.signingKeys.store.set(`${key}0`, 'b');

    await handler.invalidateSigningKeysCacheForScope(scope);

    expect(cache.signingKeys.store.size).toBe(0);
  });

  it('invalidateAuthorizationResultsForUser deletes only that user prefix', async () => {
    const { handler, cache } = createProbe();
    const authKey = (user: string, org: string) =>
      `${AUTH_RESULT_CACHE_KEY_PREFIX}${user}:organization:${org}:doc:read:none`;
    cache.permissions.store.set(authKey('user-1', 'org-1'), 1);
    cache.permissions.store.set(authKey('user-1', 'org-2'), 2);
    cache.permissions.store.set(authKey('user-2', 'org-1'), 3);
    // A scoped-id entry sharing the namespace must survive.
    cache.permissions.store.set(key, new Set(['scoped-id']));

    await handler.publicInvalidateAuthResults('user-1');

    expect([...cache.permissions.store.keys()].sort()).toEqual(
      [authKey('user-2', 'org-1'), key].sort()
    );
  });
});

describe('authorization cache key', () => {
  const permission = { resource: 'Document', action: 'Read' };

  it('normalizes resource and action case and whitespace', () => {
    const { handler } = createProbe();

    expect(
      handler.publicAuthCacheKey('u1', scope, { resource: '  DoCuMeNt ', action: ' READ ' })
    ).toBe(handler.publicAuthCacheKey('u1', scope, { resource: 'document', action: 'read' }));
  });

  it('separates users, scopes, and permissions', () => {
    const { handler } = createProbe();
    const base = handler.publicAuthCacheKey('u1', scope, permission);

    expect(handler.publicAuthCacheKey('u2', scope, permission)).not.toBe(base);
    expect(
      handler.publicAuthCacheKey('u1', { tenant: Tenant.Organization, id: 'org-2' }, permission)
    ).not.toBe(base);
    expect(
      handler.publicAuthCacheKey('u1', scope, { resource: 'Document', action: 'Write' })
    ).not.toBe(base);
  });

  it('separates entries by granted OAuth scopes', () => {
    // The security-relevant one: two project-app tokens with different consented
    // scopes must not share an authorization result.
    const { handler } = createProbe();
    const readOnly = handler.publicAuthCacheKey('u1', scope, permission, undefined, ['read']);
    const readWrite = handler.publicAuthCacheKey('u1', scope, permission, undefined, [
      'read',
      'write',
    ]);

    expect(readOnly).not.toBe(readWrite);
  });

  it('treats granted scopes as an unordered, case-insensitive set', () => {
    const { handler } = createProbe();

    expect(handler.publicAuthCacheKey('u1', scope, permission, undefined, ['read', 'write'])).toBe(
      handler.publicAuthCacheKey('u1', scope, permission, undefined, [' WRITE', 'Read '])
    );
  });

  it('omits the granted-scope segment entirely when none are supplied', () => {
    const { handler } = createProbe();
    const none = handler.publicAuthCacheKey('u1', scope, permission);
    const empty = handler.publicAuthCacheKey('u1', scope, permission, undefined, []);

    expect(none).toBe(empty);
    // auth:result: (2) + userId, tenant, scopeId, resource, action, contextHash
    expect(none.split(':')).toHaveLength(8);
    expect(none.startsWith(AUTH_RESULT_CACHE_KEY_PREFIX)).toBe(true);
  });

  it('separates entries by resource context', () => {
    const { handler } = createProbe();
    const noContext = handler.publicAuthCacheKey('u1', scope, permission);
    const withContext = handler.publicAuthCacheKey('u1', scope, permission, {
      resource: { ownerId: 'u9' },
    });

    expect(noContext).toContain(':none');
    expect(withContext).not.toBe(noContext);
  });

  it('round-trips a result through get/set on the permissions namespace', async () => {
    const { handler, cache } = createProbe();
    const cacheKey = handler.publicAuthCacheKey('u1', scope, permission);

    await handler.publicSetAuthResult(cacheKey, { allowed: true }, 60);

    expect(cache.permissions.set).toHaveBeenCalledWith(cacheKey, { allowed: true }, 60);
    await expect(handler.publicGetAuthResult(cacheKey)).resolves.toEqual({ allowed: true });
  });

  it('returns null for an absent result rather than undefined', async () => {
    const { handler } = createProbe();
    await expect(handler.publicGetAuthResult('missing')).resolves.toBeNull();
  });
});
