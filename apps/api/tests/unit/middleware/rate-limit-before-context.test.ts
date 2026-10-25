import { InMemoryCacheAdapter } from '@grantjs/cache/memory';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Slice 1: an IP `auth:` / `global:` 429 must not pay JWT or the handler toolbox, and
 * must not enter the RLS rebuild. The optional tenant bucket still keys on scope after
 * authenticate.
 */

const createRepositories = vi.hoisted(() => vi.fn(() => ({ signingKeyRepository: {} })));
const createServices = vi.hoisted(() => vi.fn(() => ({})));
const createHandlers = vi.hoisted(() => vi.fn(() => ({})));
const setRlsContext = vi.hoisted(() => vi.fn(async () => undefined));
const authenticate = vi.hoisted(() => vi.fn(async () => undefined));

type MockSecurity = {
  enableRateLimit: boolean;
  enableRls: boolean;
  rateLimitMax: number;
  rateLimitWindowMinutes: number;
  rateLimitAuthMax: number;
  rateLimitAuthWindowMinutes: number;
  rateLimitPerTenantEnabled: boolean;
  rateLimitPerTenantMax: number;
  rateLimitPerTenantWindowMinutes: number;
};

const { mockSecurity, grantState } = vi.hoisted(() => ({
  mockSecurity: {
    enableRateLimit: true,
    enableRls: true,
    rateLimitMax: 2,
    rateLimitWindowMinutes: 15,
    rateLimitAuthMax: 20,
    rateLimitAuthWindowMinutes: 15,
    rateLimitPerTenantEnabled: false,
    rateLimitPerTenantMax: 2,
    rateLimitPerTenantWindowMinutes: 15,
  } as MockSecurity,
  grantState: { scope: null as null | { tenant: string; id: string } },
}));

const mockConfig = {
  security: mockSecurity,
  jwt: { systemSigningKeyCacheTtlSeconds: 60 },
  system: { systemUserId: 'system-user' },
  jobs: { afterCommitTimeoutMs: 5000 },
};

const db = {
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    await callback({});
  }),
};

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/i18n', () => ({
  getLocale: () => 'en',
  t: (_req: unknown, key: string) =>
    key === 'errors.common.tooManyRequests' ? 'Too many requests. Please try again later.' : key,
}));
vi.mock('@/lib/headers.lib', () => ({
  getAuthorizationToken: () => 'token',
  getClientIp: () => '192.168.1.1',
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
const { rateLimitMiddleware, tenantRateLimitMiddleware } =
  await import('@/middleware/rate-limit.middleware');

function buildApp() {
  const store = new InMemoryCacheAdapter();
  const app = express();
  app.use(rateLimitMiddleware(store));
  app.use(contextMiddleware(db as never, {} as never));
  app.use(tenantRateLimitMiddleware(store));
  app.get('/api/other', (_req, res) => {
    res.json({ ok: true });
  });
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return { app, store };
}

describe('IP rate limit before context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    grantState.scope = null;
    mockSecurity.enableRateLimit = true;
    mockSecurity.enableRls = true;
    mockSecurity.rateLimitMax = 2;
    mockSecurity.rateLimitAuthMax = 20;
    mockSecurity.rateLimitPerTenantEnabled = false;
    mockSecurity.rateLimitPerTenantMax = 2;
  });

  it('does not construct the handler toolbox or enter RLS on an IP 429', async () => {
    const { app } = buildApp();

    await request(app).get('/api/other').expect(200);
    await request(app).get('/api/other').expect(200);

    createRepositories.mockClear();
    createServices.mockClear();
    createHandlers.mockClear();
    setRlsContext.mockClear();
    authenticate.mockClear();
    db.transaction.mockClear();

    const res = await request(app).get('/api/other');
    expect(res.status).toBe(429);
    expect(res.body.error?.code).toBe('rate_limit_exceeded');
    expect(res.headers['retry-after']).toBeDefined();

    expect(authenticate).not.toHaveBeenCalled();
    expect(createRepositories).not.toHaveBeenCalled();
    expect(createServices).not.toHaveBeenCalled();
    expect(createHandlers).not.toHaveBeenCalled();
    expect(setRlsContext).not.toHaveBeenCalled();
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('applies a tenant 429 only after authenticate has set scope', async () => {
    mockSecurity.rateLimitMax = 100;
    mockSecurity.rateLimitPerTenantEnabled = true;
    mockSecurity.rateLimitPerTenantMax = 2;
    grantState.scope = { tenant: 'organization', id: 'org-123' };

    const { app } = buildApp();

    await request(app).get('/api/other').expect(200);
    await request(app).get('/api/other').expect(200);
    expect(authenticate).toHaveBeenCalledTimes(2);

    const res = await request(app).get('/api/other');
    expect(res.status).toBe(429);
    expect(res.body.error?.code).toBe('rate_limit_exceeded');
    expect(authenticate).toHaveBeenCalledTimes(3);
    expect(setRlsContext).toHaveBeenCalled();
    expect(createHandlers).toHaveBeenCalled();
  });

  it('does not apply the tenant bucket when authenticate leaves scope unset', async () => {
    mockSecurity.rateLimitMax = 100;
    mockSecurity.rateLimitPerTenantEnabled = true;
    mockSecurity.rateLimitPerTenantMax = 1;
    grantState.scope = null;

    const { app } = buildApp();

    await request(app).get('/api/other').expect(200);
    await request(app).get('/api/other').expect(200);
    expect(authenticate).toHaveBeenCalledTimes(2);
    expect(createHandlers).toHaveBeenCalled();
  });
});
