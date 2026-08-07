import { Scope, Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { BadRequestError } from '@/lib/errors';

import { CACHE_NAMESPACES, createCacheHandler, totalServiceCalls } from './cache-handler.fixtures';

/**
 * Regression for the fail-open found by the independent security review of
 * slice 5 (commit `f2da1635`).
 *
 * That refactor replaced a per-method `switch (scope.tenant)` with a lookup on
 * `descriptor.byTenant`, an object literal. `byTenant['toString']` is therefore
 * truthy and callable off `Object.prototype`, so the `if (!resolve) throw` gate
 * was skipped and eight of the nine methods **returned** `'[object Undefined]'`
 * where the switch had thrown — and cached it.
 *
 * `scope.tenant` is attacker-controlled: every path in `scope-extractor.ts`
 * casts it out of a header, query param or body with `as Tenant`. That is fixed
 * separately, at the boundary; this file pins the dispatch itself, because
 * either fix alone would make these pass and the dispatch does not get to
 * depend on the boundary staying correct.
 *
 * Enum tenants are covered by `cache-handler.scoped-ids.test.ts`. This file
 * covers only what is *not* a `Tenant`.
 */
const PROTOTYPE_KEYS = [
  'toString',
  'valueOf',
  'constructor',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
] as const;

const UNRECOGNISED = ['', 'ACCOUNT', 'Account', 'account ', 'nope', '__lookupGetter__'] as const;

const SCOPED_ID_METHODS = [
  'getScopedProjectIds',
  'getScopedRoleIds',
  'getScopedUserIds',
  'getScopedGroupIds',
  'getScopedPermissionIds',
  'getScopedResourceIds',
  'getScopedTagIds',
  'getScopedApiKeyIds',
  'getScopedProjectAppIds',
] as const;

const hostileScope = (tenant: string): Scope =>
  ({ tenant, id: 'org-1:proj-1' }) as unknown as Scope;

describe('scoped-id dispatch rejects non-enum tenants', () => {
  it.each([...PROTOTYPE_KEYS, ...UNRECOGNISED])(
    'rejects tenant %o on every method',
    async (bad) => {
      const { handler } = createCacheHandler();

      for (const method of SCOPED_ID_METHODS) {
        await expect(
          handler[method](hostileScope(bad)),
          `${method} must reject tenant ${JSON.stringify(bad)}`
        ).rejects.toBeInstanceOf(BadRequestError);
      }
    }
  );

  // The original defect cached the poisoned value, so a second request would
  // have been served from cache without reaching the dispatch at all.
  it('writes nothing to any cache namespace when the tenant is rejected', async () => {
    const { handler, cache } = createCacheHandler();

    for (const method of SCOPED_ID_METHODS) {
      await handler[method](hostileScope('toString')).catch(() => undefined);
    }

    for (const namespace of CACHE_NAMESPACES) {
      expect(cache[namespace].store.size, `${namespace} must not be written`).toBe(0);
    }
  });

  it('never reaches a scope service for a rejected tenant', async () => {
    const { handler, scopeServices } = createCacheHandler();

    for (const method of SCOPED_ID_METHODS) {
      await handler[method](hostileScope('valueOf')).catch(() => undefined);
    }

    expect(totalServiceCalls(scopeServices)).toBe(0);
  });

  it('rejects rather than throwing a TypeError', async () => {
    const { handler } = createCacheHandler();

    await expect(handler.getScopedRoleIds(hostileScope('constructor'))).rejects.not.toBeInstanceOf(
      TypeError
    );
  });

  // The hardening must not narrow the real surface.
  it('still resolves a supported enum tenant', async () => {
    const { handler } = createCacheHandler();

    await expect(
      handler.getScopedProjectIds({ tenant: Tenant.Account, id: 'acc-1' })
    ).resolves.toBeInstanceOf(Array);
  });
});
