/**
 * Platform OAuth REST wiring: public provider list and GET /api/auth/:provider.
 */
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { errorHandler } from '@/middleware/error.middleware';
import { createAuthRoutes } from '@/rest/routes/auth.routes';
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

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    app: { isDevelopment: false, isProduction: false },
    jwt: { refreshTokenExpirationDays: 30 },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
    security: { frontendUrl: 'https://app.example.com' },
  },
}));

vi.mock('@/config', () => ({
  config: mockConfig,
  SOCIAL_OAUTH_PROVIDERS: [
    UserAuthenticationMethodProvider.Github,
    UserAuthenticationMethodProvider.Google,
  ],
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

function buildContext(): RequestContext {
  return {
    grant: {} as never,
    user: null,
    handlers: {
      oauth: {
        listProviders: vi.fn().mockResolvedValue([
          { id: UserAuthenticationMethodProvider.Github, configured: true },
          { id: UserAuthenticationMethodProvider.Google, configured: true },
        ]),
        initiateAuth: vi
          .fn()
          .mockImplementation(async (provider: UserAuthenticationMethodProvider) => ({
            authorizationUrl: `https://idp.example/${provider}?state=csrf`,
          })),
        getStoredState: vi.fn().mockResolvedValue(null),
      },
      auth: {
        login: vi.fn(),
        register: vi.fn(),
        refreshSession: vi.fn(),
      },
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

describe('OAuth auth REST integration', () => {
  let app: express.Express;
  let context: RequestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = buildContext();
    app = express();
    app.use(express.json());
    app.use(mockI18nMiddleware);
    app.use('/api/auth', createAuthRoutes(context));
    app.use(errorHandler);
  });

  it('GET /api/auth/providers lists github and google with configured flags', async () => {
    const res = await request(app).get('/api/auth/providers').expect(200);

    expect(res.body).toEqual({
      success: true,
      data: {
        providers: [
          { id: UserAuthenticationMethodProvider.Github, configured: true },
          { id: UserAuthenticationMethodProvider.Google, configured: true },
        ],
      },
    });
  });

  it('GET /api/auth/google redirects to the Google authorization URL', async () => {
    const res = await request(app).get('/api/auth/google').expect(302);

    expect(res.headers.location).toBe(
      `https://idp.example/${UserAuthenticationMethodProvider.Google}?state=csrf`
    );
    expect(context.handlers.oauth.initiateAuth).toHaveBeenCalledWith(
      UserAuthenticationMethodProvider.Google,
      expect.objectContaining({
        action: 'login',
      })
    );
  });

  it('GET /api/auth/github redirects to the GitHub authorization URL', async () => {
    const res = await request(app).get('/api/auth/github').expect(302);

    expect(res.headers.location).toBe(
      `https://idp.example/${UserAuthenticationMethodProvider.Github}?state=csrf`
    );
  });
});
