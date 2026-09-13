/**
 * MFA REST wiring smoke: unauthenticated session cannot call verify (authenticateRestRoute → 401).
 *
 * Mirrors the production pattern: per-request `req.context` is passed into `createAuthRoutes`
 * (see apps/api/src/server.ts).
 */
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '@/middleware/error.middleware';
import { createAuthRoutes } from '@/rest/routes/auth.routes';
import type { ContextRequest, RequestContext } from '@/types';

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

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    app: { isDevelopment: false, isProduction: false },
    jwt: { refreshTokenExpirationDays: 30 },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({
  config: mockConfig,
  SOCIAL_OAUTH_PROVIDERS: ['github', 'google'],
}));

function mockI18nMiddleware(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).i18n = {
    t: (key: string) => `Localized: ${key}`,
    language: 'en',
  };
  next();
}

function buildUnauthenticatedContext(): RequestContext {
  return {
    grant: {} as never,
    user: null,
    handlers: {
      auth: {
        verifyMfa: vi.fn(),
        verifyMfaRecoveryCode: vi.fn(),
        setupMfa: vi.fn(),
      },
      me: { getMe: vi.fn() },
    } as never,
    resourceResolvers: {} as never,
    requestLogger: noopLogger as never,
    origin: 'https://api.example.com',
    requestBaseUrl: 'https://api.example.com',
    locale: 'en',
    userAgent: null,
    ipAddress: null,
  };
}

describe('MFA auth REST integration', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(mockI18nMiddleware);
    app.use((req, _res, next) => {
      const ctx = buildUnauthenticatedContext();
      (req as ContextRequest).context = ctx;
      next();
    });
    app.use('/api/auth', (req, res, next) => {
      createAuthRoutes((req as ContextRequest).context!)(req, res, next);
    });
    app.use(errorHandler);
  });

  it('returns 401 for POST /api/auth/mfa/verify without an authenticated user on context', async () => {
    const res = await request(app).post('/api/auth/mfa/verify').send({ code: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});
