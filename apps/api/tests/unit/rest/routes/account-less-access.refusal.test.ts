/**
 * A user who owns no account asking the real REST guards for account-scoped routes in a
 * scope that is not theirs. `Grant.isAuthorized` answers "no" for such a user (see
 * grant.account-less.test.ts); this proves the routes turn that answer into a 403 and
 * never reach a handler -- including the creation routes, so a closed install cannot be
 * given an account or an organization through them.
 */
import { Tenant, TokenType } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '@/middleware/error.middleware';
import { createOrganizationRoutes } from '@/rest/routes/organizations.routes';
import { createProjectsRouter } from '@/rest/routes/projects.routes';
import { createUserRoutes } from '@/rest/routes/users.routes';
import type { RequestContext } from '@/types';

const noopLogger = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: () => noopLogger,
};

vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => noopLogger,
}));

const scope = { tenant: Tenant.Account, id: '40000000-0000-4000-8000-000000000001' };
const scopeHeaders = { 'x-scope-tenant': scope.tenant, 'x-scope-id': scope.id };

describe('account-scoped REST routes refuse a user with no account', () => {
  let touched: string[];
  let isAuthorized: ReturnType<typeof vi.fn>;
  let app: express.Express;

  beforeEach(() => {
    touched = [];
    isAuthorized = vi.fn().mockResolvedValue({ authorized: false, reason: 'NO_MATCHING' });
    const known: Record<string, unknown> = {
      auth: { isAuthorized, isPersonalScope: vi.fn().mockResolvedValue(false) },
      me: { hasActiveMfaEnrollmentForUser: vi.fn().mockResolvedValue(false) },
      organizations: { getOrganizations: vi.fn().mockResolvedValue({ organizations: [] }) },
    };
    const handlers = new Proxy(known, {
      get(target, property: string) {
        if (property in target) return target[property];
        touched.push(property);
        throw new Error(`handler "${property}" reached by a user with no account`);
      },
    });
    const context = {
      grant: {} as never,
      user: {
        userId: '40000000-0000-4000-8000-000000000099',
        type: TokenType.Session,
        scope,
        isVerified: true,
        mfaVerified: true,
        tokenId: 'token-1',
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      },
      handlers,
      resourceResolvers: new Proxy({}, { get: () => async () => ({ id: 'resource' }) }),
      requestLogger: noopLogger,
    } as unknown as RequestContext;

    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as unknown as { context: RequestContext }).context = context;
      next();
    });
    app.use('/api/organizations', createOrganizationRoutes(context));
    app.use('/api/projects', createProjectsRouter(context));
    app.use('/api/users', createUserRoutes(context));
    app.use(errorHandler);
  });

  it.each([
    ['GET', '/api/organizations', undefined],
    ['POST', '/api/organizations', { scope, name: 'Acme' }],
    ['GET', '/api/projects', undefined],
    ['GET', '/api/users', undefined],
  ] as const)('%s %s', async (method, path, body) => {
    const res = await request(app)
      [method === 'GET' ? 'get' : 'post'](path)
      .set(scopeHeaders)
      .query(method === 'GET' ? { tenant: scope.tenant, scopeId: scope.id } : {})
      .send(body);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(isAuthorized).toHaveBeenCalledTimes(1);
    expect(touched).toEqual([]);
  });
});
