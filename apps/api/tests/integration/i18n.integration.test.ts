/**
 * Integration test: REST error responses include translationKey and localized error message.
 * Verifies the chain: domain error → mapDomainToHttp → error handler → JSON body with translationKey.
 */
import { AuthenticationError } from '@grantjs/core';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '@/middleware/error.middleware';

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

/** Middleware that attaches a minimal req.i18n so translateError can run. */
function mockI18nMiddleware(
  req: express.Request,
  _res: express.Response,
  next: express.NextFunction
) {
  // Minimal i18n mock for translateError; cast to satisfy i18next Request augmentation in tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).i18n = {
    t: (key: string, params?: Record<string, string>) =>
      params && Object.keys(params).length > 0
        ? `Localized: ${key} (${JSON.stringify(params)})`
        : `Localized: ${key}`,
    language: 'en',
  };
  next();
}

describe('i18n error response integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('401 with AuthenticationError returns translationKey and localized error', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockI18nMiddleware);
    app.get('/protected', () => {
      throw new AuthenticationError('Not authenticated');
    });
    app.use(errorHandler);

    const res = await request(app).get('/protected').set('Accept-Language', 'en');

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({
      code: 'UNAUTHENTICATED',
      translationKey: 'errors.auth.notAuthenticated',
      error: 'Localized: errors.auth.notAuthenticated',
    });
  });

  it('Accept-Language influences localized error message', async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).i18n = {
        t: (key: string) =>
          req.get('Accept-Language')?.startsWith('de') ? `Übersetzt: ${key}` : `Localized: ${key}`,
        language: req.get('Accept-Language')?.startsWith('de') ? 'de' : 'en',
      };
      next();
    });
    app.get('/protected', () => {
      throw new AuthenticationError('Not authenticated');
    });
    app.use(errorHandler);

    const res = await request(app).get('/protected').set('Accept-Language', 'de');

    expect(res.status).toBe(401);
    expect(res.body.translationKey).toBe('errors.auth.notAuthenticated');
    expect(res.body.error).toBe('Übersetzt: errors.auth.notAuthenticated');
  });

  it('404 with NotFoundError returns translationKey and translationParams when present', async () => {
    const { NotFoundError } = await import('@/lib/errors');
    const app = express();
    app.use(express.json());
    app.use(mockI18nMiddleware);
    app.get('/org/:id', () => {
      throw new NotFoundError('Organization', 'org-123');
    });
    app.use(errorHandler);

    const res = await request(app).get('/org/org-123');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      code: 'NOT_FOUND',
      translationKey: 'errors.notFound.organization',
      translationParams: { organizationId: 'org-123' },
    });
    expect(res.body.error).toContain('errors.notFound.organization');
    expect(res.body.error).toContain('org-123');
  });
});
