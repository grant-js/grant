import type { ISecretResolver } from '@grantjs/core';
import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockConfig = {
  security: { originVerifyHeader: 'x-origin-verify', originVerifyRequired: false },
  logging: { level: 'silent' as const, prettyPrint: false },
  i18n: { defaultLocale: 'en' as const },
  app: { isDevelopment: false, isProduction: false },
};
vi.mock('@/config', () => ({ config: mockConfig }));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

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

const { originVerifyMiddleware } = await import('@/middleware/origin-verify.middleware');
const { errorHandler } = await import('@/middleware/error.middleware');

const SECRET = 'origin-verify-integration-secret';

function resolverWith(secret: string | undefined): ISecretResolver {
  return { resolve: vi.fn().mockResolvedValue(secret) };
}

function mockI18nMiddleware(req: Request, _res: Response, next: NextFunction) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).i18n = {
    t: (key: string) => `Localized: ${key}`,
    language: 'en',
  };
  next();
}

function appWith(resolver: ISecretResolver) {
  const app = express();
  app.use(mockI18nMiddleware);
  app.use(originVerifyMiddleware(resolver));
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('originVerifyMiddleware HTTP', () => {
  beforeEach(() => {
    mockConfig.security.originVerifyRequired = true;
  });

  it('returns 403 when the secret is required and the header is missing', async () => {
    const res = await request(appWith(resolverWith(SECRET))).get('/health');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.translationKey).toBe('errors.auth.forbidden');
  });

  it('admits the request when the origin-verify header matches', async () => {
    const res = await request(appWith(resolverWith(SECRET)))
      .get('/health')
      .set('x-origin-verify', SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('is a pass-through when no secret is configured and none is required', async () => {
    mockConfig.security.originVerifyRequired = false;
    const res = await request(appWith(resolverWith(undefined))).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
