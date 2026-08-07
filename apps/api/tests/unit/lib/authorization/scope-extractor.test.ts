import { Tenant } from '@grantjs/schema';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { extractScopeFromRequest } from '@/lib/authorization/scope-extractor';

/**
 * Every extraction path casts `tenant` with `as Tenant` and no check, so until
 * the validating wrapper landed, whatever a caller sent in a header, query
 * param, or body became `context.user.scope.tenant` verbatim. Downstream that
 * value indexed the `CacheHandler` scoped-id dispatch, where an unrecognised
 * key reached `Object.prototype` and resolved instead of being rejected.
 *
 * An unknown tenant is treated as *no scope* rather than as an error: the
 * caller then fails authorization, which is the same outcome as sending no
 * scope at all, and does not disclose which tenant names are real.
 */
const request = (parts: Partial<Request>): Request =>
  ({ headers: {}, query: {}, body: undefined, ...parts }) as unknown as Request;

describe('extractScopeFromRequest', () => {
  it('reads a valid scope from headers', () => {
    expect(
      extractScopeFromRequest(
        request({ headers: { 'x-scope-tenant': Tenant.Account, 'x-scope-id': 'acc-1' } })
      )
    ).toEqual({ tenant: Tenant.Account, id: 'acc-1' });
  });

  it('accepts every member of the Tenant enum', () => {
    for (const tenant of Object.values(Tenant)) {
      expect(
        extractScopeFromRequest(
          request({ headers: { 'x-scope-tenant': tenant, 'x-scope-id': 'x' } })
        ),
        `${tenant} must be accepted`
      ).toEqual({ tenant, id: 'x' });
    }
  });

  it.each([
    'toString',
    'constructor',
    '__proto__',
    'valueOf',
    'hasOwnProperty',
    'ACCOUNT',
    'Account',
    'account ',
    'nope',
    '',
  ])('returns null for the header tenant %o', (tenant) => {
    expect(
      extractScopeFromRequest(request({ headers: { 'x-scope-tenant': tenant, 'x-scope-id': 'x' } }))
    ).toBeNull();
  });

  it('rejects an unknown tenant from the query params', () => {
    expect(
      extractScopeFromRequest(request({ query: { scopeId: 'x', tenant: 'toString' } as never }))
    ).toBeNull();
    expect(
      extractScopeFromRequest(request({ query: { scopeId: 'x', tenant: Tenant.Account } as never }))
    ).toEqual({ tenant: Tenant.Account, id: 'x' });
  });

  it('rejects an unknown tenant from a nested query scope', () => {
    expect(
      extractScopeFromRequest(
        request({ query: { scope: { tenant: 'valueOf', id: 'x' } } as never })
      )
    ).toBeNull();
  });

  // The body path returns `req.body.scope` wholesale, so it was the loosest.
  it('rejects an unknown tenant from the request body', () => {
    expect(
      extractScopeFromRequest(request({ body: { scope: { tenant: 'toString', id: 'x' } } }))
    ).toBeNull();
    expect(
      extractScopeFromRequest(
        request({ body: { scope: { tenant: Tenant.Organization, id: 'x' } } })
      )
    ).toEqual({ tenant: Tenant.Organization, id: 'x' });
  });

  it('rejects an unknown tenant from GraphQL variables', () => {
    expect(
      extractScopeFromRequest(
        request({ body: { variables: { scope: { tenant: 'constructor', id: 'x' } } } })
      )
    ).toBeNull();
  });

  it.each([
    ['a non-string tenant', { scope: { tenant: 42, id: 'x' } }],
    ['a null tenant', { scope: { tenant: null, id: 'x' } }],
    ['an object tenant', { scope: { tenant: {}, id: 'x' } }],
  ])('returns null for %s', (_label, body) => {
    expect(extractScopeFromRequest(request({ body }))).toBeNull();
  });

  it('returns null when no scope is present at all', () => {
    expect(extractScopeFromRequest(request({}))).toBeNull();
  });
});
