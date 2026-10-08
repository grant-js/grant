/**
 * REST wiring for closed-install signup policy and last-human delete.
 */
import { AccountType, UserAuthenticationMethodProvider } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { LAST_HUMAN_USER_REASON, PUBLIC_SIGNUP_DISABLED_REASON } from '@/lib/signup-policy.lib';
import { errorHandler } from '@/middleware/error.middleware';
import { createAuthRoutes } from '@/rest/routes/auth.routes';
import { createMeRouter } from '@/rest/routes/me.routes';
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

vi.mock('@/lib/authorization', () => ({
  authenticateRestRoute: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => next(),
  authenticateGraphQLResolver: vi.fn(),
}));

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    app: { isDevelopment: false, isProduction: false },
    jwt: { refreshTokenExpirationDays: 30 },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
    security: { frontendUrl: 'https://app.example.com' },
    auth: { publicSignupEnabled: false },
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
    user: { userId: 'human-1' } as never,
    handlers: {
      oauth: {
        listProviders: vi.fn().mockResolvedValue([
          { id: UserAuthenticationMethodProvider.Github, configured: false },
          { id: UserAuthenticationMethodProvider.Google, configured: false },
        ]),
      },
      auth: {
        register: vi.fn(),
        getSignupPolicy: vi.fn().mockResolvedValue({
          publicSignupEnabled: false,
          bootstrapOpen: false,
        }),
      },
      me: {
        deleteMyAccounts: vi.fn(),
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

const registerBody = {
  name: 'Ada',
  type: AccountType.Personal,
  provider: UserAuthenticationMethodProvider.Email,
  providerId: 'ada@example.com',
  providerData: { password: 'Xe9#mK2!vQ7z' },
};

describe('closed-install REST', () => {
  let app: express.Express;
  let context: RequestContext;

  beforeEach(() => {
    vi.clearAllMocks();
    context = buildContext();
    app = express();
    app.use(express.json());
    app.use(mockI18nMiddleware);
    app.use('/api/auth', createAuthRoutes(context));
    app.use('/api/me', createMeRouter(context));
    app.use(errorHandler);
  });

  it('GET /api/auth/providers exposes publicSignupEnabled and bootstrapOpen', async () => {
    const res = await request(app).get('/api/auth/providers').expect(200);

    expect(res.body.data.publicSignupEnabled).toBe(false);
    expect(res.body.data.bootstrapOpen).toBe(false);
  });

  it('POST /api/auth/register returns 403 PUBLIC_SIGNUP_DISABLED after bootstrap', async () => {
    vi.mocked(context.handlers.auth.register).mockRejectedValue(
      new AuthorizationError('Public signup is disabled', PUBLIC_SIGNUP_DISABLED_REASON)
    );

    const res = await request(app).post('/api/auth/register').send(registerBody);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.extensions).toMatchObject({ reason: PUBLIC_SIGNUP_DISABLED_REASON });
  });

  it('POST /api/auth/register with invitation proof is not blocked by this layer', async () => {
    vi.mocked(context.handlers.auth.register).mockResolvedValue({
      account: { id: 'account-1', type: AccountType.Personal },
      accessToken: 'access',
      refreshToken: 'refresh',
    } as never);

    await request(app)
      .post('/api/auth/register')
      .send({
        ...registerBody,
        emailVerificationProof: {
          type: 'ORGANIZATION_INVITATION',
          token: 'invitation-token',
          emailProofToken: 'email-proof-token',
        },
      })
      .expect(201);

    expect(context.handlers.auth.register).toHaveBeenCalledWith(
      expect.objectContaining({
        emailVerificationProof: expect.objectContaining({
          token: 'invitation-token',
          emailProofToken: 'email-proof-token',
        }),
      }),
      'en',
      null,
      null,
      context.requestLogger,
      'https://api.example.com'
    );
  });

  it('DELETE /api/me/accounts returns 403 LAST_HUMAN_USER', async () => {
    vi.mocked(context.handlers.me.deleteMyAccounts).mockRejectedValue(
      new AuthorizationError('Cannot delete the last human user', LAST_HUMAN_USER_REASON)
    );

    const res = await request(app).delete('/api/me/accounts').send({ hardDelete: false });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
    expect(res.body.extensions).toMatchObject({ reason: LAST_HUMAN_USER_REASON });
  });
});
