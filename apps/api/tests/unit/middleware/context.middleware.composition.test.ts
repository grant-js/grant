import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Slice 2: JWT authenticate plus the handler toolbox once per request.
 * Auth may keep a thin unscoped Grant/signing-key bootstrap. Scoped queries
 * still run on the RLS transaction after SET LOCAL.
 */

const createRepositories = vi.hoisted(() =>
  vi.fn((_db: unknown) => ({ signingKeyRepository: {} }))
);
const createServices = vi.hoisted(() => vi.fn(() => ({})));
const createHandlers = vi.hoisted(() => vi.fn(() => ({})));
const setRlsContext = vi.hoisted(() => vi.fn(async () => undefined));
const authenticate = vi.hoisted(() => vi.fn(async () => undefined));

const mockConfig = {
  security: { enableRls: true },
  jwt: { systemSigningKeyCacheTtlSeconds: 60 },
  system: { systemUserId: 'system-user' },
  jobs: { afterCommitTimeoutMs: 5000 },
};
const grantState = { scope: null as null | { tenant: string; id: string } };

const db = {
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    await callback({ kind: 'request-tx' });
  }),
};

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/i18n', () => ({ getLocale: () => 'en' }));
vi.mock('@/lib/headers.lib', () => ({
  getAuthorizationToken: () => 'token',
  getClientIp: () => '127.0.0.1',
  getContextHeaders: () => ({ origin: 'http://localhost', userAgent: 'test' }),
  getRequestBaseUrl: () => 'http://localhost',
}));
vi.mock('@/lib/authorization/scope-extractor', () => ({ extractScopeFromRequest: () => null }));
vi.mock('@/lib/audit', () => ({ DrizzleAuditLogger: class {} }));
vi.mock('@/lib/events', () => ({ DrizzleEventPublisher: class {} }));
vi.mock('@/lib/token', () => ({ JwtTokenProvider: class {} }));
vi.mock('@/lib/rls', () => ({
  hasRlsKeys: () => true,
  scopeToRlsContext: () => ({ accountId: 'a', projectId: 'p' }),
  setRlsContext,
}));
vi.mock('@/lib/transaction-manager.lib', () => ({ DrizzleTransactionalConnection: class {} }));
vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));
vi.mock('@/repositories', () => ({ createRepositories }));
vi.mock('@/repositories/grant.repository', () => ({ GrantRepository: class {} }));
vi.mock('@/repositories/signing-keys.repository', () => ({ SigningKeyRepository: class {} }));
vi.mock('@/resource-resolvers', () => ({ createResourceResolvers: () => ({}) }));
vi.mock('@/services', () => ({ createServices }));
vi.mock('@/services/grant.service', () => ({ GrantService: class {} }));
vi.mock('@/services/signing-keys.service', () => ({ SigningKeyService: class {} }));
vi.mock('@/handlers', () => ({ createHandlers }));
vi.mock('@grantjs/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@grantjs/core')>()),
  Grant: class {
    get auth() {
      return grantState.scope ? { userId: 'user-1', scope: grantState.scope } : null;
    }
    authenticate = authenticate;
  },
}));

const { contextMiddleware } = await import('@/middleware/context.middleware');

function app() {
  const server = express();
  server.use(contextMiddleware(db as never, {} as never));
  server.get('/x', (_req, res) => {
    res.json({ ok: true });
  });
  return server;
}

describe('contextMiddleware composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grantState.scope = null;
    mockConfig.security.enableRls = true;
  });

  it('builds the handler graph once on a scoped RLS request, after authenticate and SET LOCAL', async () => {
    grantState.scope = { tenant: 'accountProject', id: 'a:p' };
    await request(app()).get('/x').expect(200);

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(setRlsContext).toHaveBeenCalledTimes(1);
    expect(createRepositories).toHaveBeenCalledTimes(1);
    expect(createServices).toHaveBeenCalledTimes(1);
    expect(createHandlers).toHaveBeenCalledTimes(1);
    expect(createRepositories.mock.calls[0]?.[0]).toEqual({ kind: 'request-tx' });
    expect(createRepositories.mock.calls[0]?.[0]).not.toBe(db);
  });

  it('builds the handler graph once on the pool when the request is unscoped', async () => {
    grantState.scope = null;
    await request(app()).get('/x').expect(200);

    expect(authenticate).toHaveBeenCalledTimes(1);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(setRlsContext).not.toHaveBeenCalled();
    expect(createRepositories).toHaveBeenCalledTimes(1);
    expect(createRepositories).toHaveBeenCalledWith(db);
    expect(createServices).toHaveBeenCalledTimes(1);
    expect(createHandlers).toHaveBeenCalledTimes(1);
  });
});
