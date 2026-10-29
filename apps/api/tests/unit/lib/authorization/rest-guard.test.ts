/**
 * `authorizeRestRoute` authorizes against the scope on `context.user.scope` (or, when the context
 * has none, the scope derived from the request). The route acts on the scope in the body or the
 * query. The guard refuses a request that names another scope, before it looks anything up and
 * before it evaluates a permission, with the 403 body the guard already used.
 */
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, TokenType } from '@grantjs/schema';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

import { AUTHORIZED_REST_ROUTE, authorizeRestRoute } from '@/lib/authorization/rest-guard';

const projectA = { tenant: Tenant.OrganizationProject, id: 'org-a:project-a' };
const projectB = { tenant: Tenant.OrganizationProject, id: 'org-b:project-b' };
const organizationA = { tenant: Tenant.Organization, id: 'org-a' };

type Scope = { tenant: Tenant | string; id: string };

interface RequestParts {
  body?: unknown;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
}

function setup(
  options: { authorizedScope?: Scope | null; type?: TokenType; target?: object | null } = {}
) {
  const {
    authorizedScope = projectA,
    type = TokenType.Session,
    target = { id: 'target' },
  } = options;
  const isAuthorized = vi.fn(async () => ({ authorized: true }));
  const projectResolver = vi.fn(async () => target);
  const context = {
    user: { type, userId: 'user-1', scope: authorizedScope },
    handlers: { auth: { isAuthorized } },
    resourceResolvers: { project: projectResolver },
  };
  const guard = authorizeRestRoute({
    resource: ResourceSlug.User,
    action: ResourceAction.Update,
    resourceResolver: 'project',
  });

  const call = async (parts: RequestParts = {}) => {
    const req = { headers: {}, query: {}, body: {}, ...parts, context } as unknown as Request;
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();
    await guard(req, res as unknown as Response, next as NextFunction);
    return { res, next };
  };

  return { call, isAuthorized, projectResolver, context };
}

const forbidden = { error: 'Forbidden', code: 'FORBIDDEN' };

describe('authorizeRestRoute: the scope the request names', () => {
  const forms: Array<[string, (scope: Scope) => RequestParts]> = [
    ['body.scope', (scope) => ({ body: { scope } })],
    ['body.input.scope', (scope) => ({ body: { input: { scope } } })],
    ['the scope query object', (scope) => ({ query: { scope } })],
    [
      'scopeId and tenant query parameters',
      (scope) => ({ query: { scopeId: scope.id, tenant: scope.tenant } }),
    ],
  ];

  describe.each(forms)('%s', (_label, named) => {
    it('continues when it is the authorized scope', async () => {
      const { call, isAuthorized, projectResolver } = setup();
      const { res, next } = await call(named(projectA));
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
      expect(projectResolver).toHaveBeenCalledOnce();
      expect(isAuthorized).toHaveBeenCalledOnce();
    });

    it('is refused when the id differs, without a lookup or a permission check', async () => {
      const { call, isAuthorized, projectResolver } = setup();
      const { res, next } = await call(named(projectB));
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(forbidden);
      expect(next).not.toHaveBeenCalled();
      expect(projectResolver).not.toHaveBeenCalled();
      expect(isAuthorized).not.toHaveBeenCalled();
    });

    it('is refused when only the tenant differs', async () => {
      const { call, isAuthorized, projectResolver } = setup();
      const { res, next } = await call(named({ tenant: Tenant.Organization, id: projectA.id }));
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(forbidden);
      expect(next).not.toHaveBeenCalled();
      expect(projectResolver).not.toHaveBeenCalled();
      expect(isAuthorized).not.toHaveBeenCalled();
    });

    it('is refused when the tenant is unknown, or is system', async () => {
      const { call, isAuthorized } = setup();
      for (const tenant of ['galaxy', Tenant.System]) {
        const { res, next } = await call(named({ tenant, id: projectA.id }));
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(forbidden);
        expect(next).not.toHaveBeenCalled();
      }
      expect(isAuthorized).not.toHaveBeenCalled();
    });
  });

  it('leaves a request that names no scope unchanged', async () => {
    const { call, isAuthorized, projectResolver } = setup();
    for (const parts of [
      {},
      { body: { name: 'x' } },
      { body: undefined },
      { query: { page: '2' } },
    ]) {
      const { res, next } = await call(parts);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    }
    expect(projectResolver).toHaveBeenCalledTimes(4);
    expect(isAuthorized).toHaveBeenCalledTimes(4);
  });

  it('is refused when any one of several named scopes differs', async () => {
    const { call, isAuthorized } = setup();
    const { res, next } = await call({
      body: { scope: projectA },
      query: { scopeId: projectB.id, tenant: projectB.tenant },
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('is refused for a half-named query scope', async () => {
    const { call } = setup();
    for (const query of [{ scopeId: projectA.id }, { tenant: projectA.tenant }]) {
      const { res, next } = await call({ query });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it('does not say whether the target exists', async () => {
    const { call, projectResolver } = setup({ target: null });
    const refusedCall = await call({ body: { scope: projectB } });
    expect(refusedCall.res.status).toHaveBeenCalledWith(403);
    expect(projectResolver).not.toHaveBeenCalled();

    // Same scope and a missing target is the existing "not found", which only a permitted scope sees.
    const sameScope = await call({ body: { scope: projectA } });
    expect(sameScope.res.status).toHaveBeenCalledWith(404);
  });

  it('keeps the existing scope-required answer first', async () => {
    const { call, isAuthorized } = setup({ authorizedScope: null });
    const { res, next } = await call({ body: { name: 'x' } });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SCOPE_REQUIRED' }));
    expect(next).not.toHaveBeenCalled();
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('compares against the scope derived from the request when the context has none', async () => {
    const headers = { 'x-scope-tenant': projectA.tenant, 'x-scope-id': projectA.id };

    const allowed = setup({ authorizedScope: null });
    const same = await allowed.call({ headers, body: { scope: projectA } });
    expect(same.next).toHaveBeenCalledOnce();

    const mismatched = setup({ authorizedScope: null });
    const other = await mismatched.call({ headers, body: { scope: projectB } });
    expect(other.res.status).toHaveBeenCalledWith(403);
    expect(other.res.json).toHaveBeenCalledWith(forbidden);
    expect(other.next).not.toHaveBeenCalled();
    expect(mismatched.isAuthorized).not.toHaveBeenCalled();
  });
});

describe('authorizeRestRoute: API key and project app requests', () => {
  it.each([TokenType.ApiKey, TokenType.ProjectApp])(
    'a %s request is authorized in the token scope, so a body naming another scope is refused',
    async (type) => {
      const { call, isAuthorized } = setup({ type, authorizedScope: organizationA });
      const { res, next } = await call({ body: { scope: projectA } });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(forbidden);
      expect(next).not.toHaveBeenCalled();
      expect(isAuthorized).not.toHaveBeenCalled();
    }
  );

  it.each([TokenType.ApiKey, TokenType.ProjectApp])(
    'a %s request naming the token scope continues',
    async (type) => {
      const { call } = setup({ type, authorizedScope: organizationA });
      const { next } = await call({ body: { scope: organizationA } });
      expect(next).toHaveBeenCalledOnce();
    }
  );
});

describe('the authorization mark', () => {
  it('is set on the middleware authorizeRestRoute returns', () => {
    const guard = authorizeRestRoute({
      resource: ResourceSlug.User,
      action: ResourceAction.Update,
    });
    expect((guard as unknown as Record<PropertyKey, unknown>)[AUTHORIZED_REST_ROUTE]).toBe(true);
  });
});
