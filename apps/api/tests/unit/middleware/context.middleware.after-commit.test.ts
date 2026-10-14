import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * After-commit callbacks (the SQS enqueue behind `POST /sync/jobs`) must finish BEFORE the HTTP
 * response is flushed, and only AFTER the transaction has committed.
 *
 * On AWS Lambda the execution environment is frozen as soon as the response is returned. The
 * enqueue used to run after the response, so the in-flight `SendMessage` was cut off: the job
 * row stayed `pending` and the queue never saw a message, with nothing logged.
 *
 * These tests run a real Express app through the real middleware; only the object graph that
 * the middleware assembles (grant, services, handlers) and the database are replaced.
 */

const events: string[] = [];
const requestLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() };

const dbState = { commitFails: false };
const mockConfig = {
  security: { enableRls: true },
  jwt: { systemSigningKeyCacheTtlSeconds: 60 },
  system: { systemUserId: 'system-user' },
};

const db = {
  transaction: vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    events.push('begin');
    await callback({});
    if (dbState.commitFails) {
      events.push('rollback');
      throw new Error('COMMIT failed');
    }
    events.push('commit');
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
  setRlsContext: vi.fn(async () => undefined),
}));
vi.mock('@/lib/transaction-manager.lib', () => ({ DrizzleTransactionalConnection: class {} }));
vi.mock('@/middleware/request-logging.middleware', () => ({
  getRequestLogger: () => requestLogger,
}));
vi.mock('@/repositories', () => ({ createRepositories: () => ({ signingKeyRepository: {} }) }));
vi.mock('@/repositories/grant.repository', () => ({ GrantRepository: class {} }));
vi.mock('@/resource-resolvers', () => ({ createResourceResolvers: () => ({}) }));
vi.mock('@/services', () => ({ createServices: () => ({}) }));
vi.mock('@/services/grant.service', () => ({ GrantService: class {} }));
vi.mock('@/services/signing-keys.service', () => ({ SigningKeyService: class {} }));
vi.mock('@/handlers', () => ({ createHandlers: () => ({}) }));
vi.mock('@grantjs/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@grantjs/core')>()),
  Grant: class {
    auth = { userId: 'user-1', scope: { tenant: 'accountProject', id: 'a:p' } };
    async authenticate() {}
  },
}));

const { contextMiddleware } = await import('@/middleware/context.middleware');

function buildApp(route: (req: Request, res: Response) => void) {
  const app = express();
  app.use(contextMiddleware(db as never, {} as never));
  app.post('/enqueue', route);
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message });
  });
  return app;
}

const schedule = (req: Request, fn: () => void | Promise<void>) =>
  (
    req as unknown as { context: { scheduleAfterCommit: (f: () => void | Promise<void>) => void } }
  ).context.scheduleAfterCommit(fn);

describe('contextMiddleware after-commit callbacks', () => {
  beforeEach(() => {
    events.length = 0;
    dbState.commitFails = false;
    mockConfig.security.enableRls = true;
    vi.clearAllMocks();
  });

  it('awaits an after-commit enqueue before the response is flushed, and only after commit', async () => {
    const app = buildApp((req, res) => {
      schedule(req, async () => {
        events.push('enqueue-start');
        // A real SQS SendMessage is a network round trip; it must not be left in flight.
        await new Promise((resolve) => setTimeout(resolve, 50));
        events.push('enqueue-done');
      });
      res.on('finish', () => events.push('response-flushed'));
      res.status(202).json({ status: 'pending' });
    });

    const response = await request(app).post('/enqueue');

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ status: 'pending' });
    expect(events).toEqual([
      'begin',
      'commit',
      'enqueue-start',
      'enqueue-done',
      'response-flushed',
    ]);
  });

  it('does not enqueue, and answers with an error, when the transaction does not commit', async () => {
    dbState.commitFails = true;
    const enqueue = vi.fn();

    const app = buildApp((req, res) => {
      schedule(req, enqueue);
      res.status(202).json({ status: 'pending' });
    });

    const response = await request(app).post('/enqueue');

    expect(enqueue).not.toHaveBeenCalled();
    expect(events).toEqual(['begin', 'rollback']);
    // The 202 was held back: the client must not be told a job exists when its row was rolled back.
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'COMMIT failed' });
  });

  it('logs a failing after-commit callback, still runs the others, and still answers', async () => {
    const second = vi.fn();
    const app = buildApp((req, res) => {
      schedule(req, async () => {
        throw new Error('SQS unavailable');
      });
      schedule(req, second);
      res.status(202).json({ status: 'pending' });
    });

    const response = await request(app).post('/enqueue');

    expect(response.status).toBe(202);
    expect(second).toHaveBeenCalledTimes(1);
    expect(requestLogger.error).toHaveBeenCalledWith(
      { err: expect.objectContaining({ message: 'SQS unavailable' }) },
      'scheduleAfterCommit callback failed'
    );
  });

  it('keeps an empty request on the plain path: commit, then respond', async () => {
    const app = buildApp((_req, res) => {
      res.on('finish', () => events.push('response-flushed'));
      res.status(200).json({ ok: true });
    });

    const response = await request(app).post('/enqueue');

    expect(response.status).toBe(200);
    expect(events).toEqual(['begin', 'commit', 'response-flushed']);
  });

  it('also waits for after-commit callbacks when the request has no transaction', async () => {
    mockConfig.security.enableRls = false;

    const app = buildApp((req, res) => {
      schedule(req, async () => {
        events.push('enqueue-start');
        await new Promise((resolve) => setTimeout(resolve, 50));
        events.push('enqueue-done');
      });
      res.on('finish', () => events.push('response-flushed'));
      res.status(202).json({ status: 'pending' });
    });

    const response = await request(app).post('/enqueue');

    expect(response.status).toBe(202);
    expect(db.transaction).not.toHaveBeenCalled();
    expect(events).toEqual(['enqueue-start', 'enqueue-done', 'response-flushed']);
  });
});
