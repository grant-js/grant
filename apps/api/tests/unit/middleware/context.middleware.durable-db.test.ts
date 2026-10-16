import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The project password sign-in records its lockout failures on `durableDb` (ADR 0011 § 5): a
 * failed request must not take the count with it. `createServices` only builds that
 * lockout over the pool when the context middleware hands the pool in, on both the scoped
 * (request transaction) and the unscoped path; leaving it out would silently fall back to
 * the request connection, so this pins it.
 */

const createServices = vi.hoisted(() => vi.fn(() => ({})));
const mockConfig = {
  security: { enableRls: true },
  jwt: { systemSigningKeyCacheTtlSeconds: 60 },
  system: { systemUserId: 'system-user' },
  jobs: { afterCommitTimeoutMs: 5000 },
};
const grantState = { scope: null as null | { tenant: string; id: string } };

const db = {
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    await callback({});
  }),
};

vi.mock('@/config', () => ({ config: mockConfig }));
vi.mock('@/i18n', () => ({ getLocale: () => 'en' }));
vi.mock('@/lib/headers.lib', () => ({
  getAuthorizationToken: () => null,
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
  setRlsContext: vi.fn(async () => undefined),
}));
vi.mock('@/lib/transaction-manager.lib', () => ({ DrizzleTransactionalConnection: class {} }));
vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));
vi.mock('@/repositories', () => ({ createRepositories: () => ({ signingKeyRepository: {} }) }));
vi.mock('@/repositories/grant.repository', () => ({ GrantRepository: class {} }));
vi.mock('@/resource-resolvers', () => ({ createResourceResolvers: () => ({}) }));
vi.mock('@/services', () => ({ createServices }));
vi.mock('@/services/grant.service', () => ({ GrantService: class {} }));
vi.mock('@/services/signing-keys.service', () => ({ SigningKeyService: class {} }));
vi.mock('@/handlers', () => ({ createHandlers: () => ({}) }));
vi.mock('@grantjs/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@grantjs/core')>()),
  Grant: class {
    get auth() {
      return grantState.scope ? { userId: 'user-1', scope: grantState.scope } : null;
    }
    async authenticate() {}
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

describe('contextMiddleware durableDb', () => {
  beforeEach(() => {
    createServices.mockClear();
  });

  it('hands the pool to createServices on a scoped (request-transaction) request', async () => {
    grantState.scope = { tenant: 'accountProject', id: 'a:p' };
    await request(app()).get('/x').expect(200);

    expect(createServices).toHaveBeenCalledTimes(1);
    const options = (createServices.mock.calls[0] as unknown[])[5] as { durableDb?: unknown };
    expect(options.durableDb).toBe(db);
  });

  it('hands the pool to createServices on an unscoped request', async () => {
    grantState.scope = null;
    await request(app()).get('/x').expect(200);

    expect(createServices).toHaveBeenCalledTimes(1);
    const options = (createServices.mock.calls[0] as unknown[])[5] as { durableDb?: unknown };
    expect(options.durableDb).toBe(db);
  });
});
