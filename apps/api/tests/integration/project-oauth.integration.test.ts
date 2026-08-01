/**
 * Integration tests for project OAuth: authorize (302 + Location), email request (202),
 * email callback (302 + fragment) with in-memory cache injection.
 *
 * Uses minimal Express app with auth routes only; handler dependencies are mocked except
 * cache (in-memory) so callback flow can be driven by injecting the email token payload.
 */
import { CacheFactory } from '@grantjs/cache';
import { Tenant, UserAuthenticationMethodProvider } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
} from '@/constants/cache.constants';
import { ProjectOAuthHandler } from '@/handlers/project-oauth.handler';
import { errorHandler } from '@/middleware/error.middleware';
import { createAuthRoutes } from '@/rest/routes/auth.routes';
import type { RequestContext } from '@/types';

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      emailEntryUrl: 'https://app.example.com/auth/project/email',
      consentUrl: 'https://app.example.com/auth/project/consent',
    },
    app: {
      url: 'https://api.example.com',
      isDevelopment: false,
      nodeEnv: 'test',
      version: 'test',
    },
    jwt: { accessTokenExpirationMinutes: 15 },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32 },
    githubOAuth: {
      isConfigured: () => true,
      projectCallbackUrl: 'https://api.example.com/api/auth/project/callback',
      callbackUrl: 'https://api.example.com/api/auth/callback',
    },
    security: { frontendUrl: 'https://app.example.com' },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en', 'de'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const fixtureApp = {
  id: 'app-id-1',
  clientId: 'client-uuid-1',
  projectId: 'project-id-1',
  redirectUris: ['https://example.com/callback'],
  enabledProviders: [] as string[],
  scopes: null as string[] | null,
  name: 'Test App',
};

interface ProjectOAuthContextOverrides {
  getProjectAppByClientId?: () => Promise<typeof fixtureApp | null>;
  /** Override for Grant.getGrantedScopeSlugs (consent-info returns labels for this list). */
  getGrantedScopeSlugs?: (
    userId: string,
    scope: unknown,
    candidateSlugs: string[]
  ) => Promise<string[]>;
  /** Override for ProjectPermissions.getScopeSlugLabelsForProject (consent-info uses this for granted slugs). */
  getScopeSlugLabelsForProject?: (
    projectId: string,
    scopeSlugs: string[]
  ) => Promise<{ slug: string; name: string; description: string | null }[]>;
}

function buildProjectOAuthContext(
  cache: ReturnType<typeof CacheFactory.createEntityCache>,
  overrides?: ProjectOAuthContextOverrides
): RequestContext {
  const projectApps = {
    getProjectAppByClientId: vi
      .fn()
      .mockImplementation(
        () => overrides?.getProjectAppByClientId?.() ?? Promise.resolve(fixtureApp)
      ),
    getProjectAppById: vi.fn().mockResolvedValue(fixtureApp),
  };
  const projectPermissions = {
    getScopeSlugLabelsForProject:
      overrides?.getScopeSlugLabelsForProject ?? vi.fn().mockResolvedValue([]),
    getAllowedScopeSlugsForProject: vi.fn().mockResolvedValue([]),
  };
  const projectUsers = {
    getProjectUsers: vi
      .fn()
      .mockResolvedValue([{ userId: 'user-1', projectId: fixtureApp.projectId }]),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };
  const userRoles = {
    addUserRole: vi.fn().mockResolvedValue(undefined),
  };
  const accountProjects = {
    getAccountProject: vi.fn().mockRejectedValue(new Error('not account project')),
  };
  const organizationProjects = {
    getOrganizationProject: vi.fn().mockResolvedValue({ organizationId: 'org-1' }),
  };
  const accounts = { getAccounts: vi.fn().mockResolvedValue({ accounts: [] }) };
  const organizationUsers = {
    getOrganizationUsers: vi.fn().mockResolvedValue([{ userId: 'user-1', roleId: 'role-1' }]),
  };
  const authHandler = {
    resolveUserIdFromGithubForProject: vi.fn().mockResolvedValue('user-1'),
    resolveUserIdFromEmailForProject: vi.fn().mockResolvedValue('user-1'),
  };
  const githubOAuth = {
    isConfigured: vi.fn().mockReturnValue(true),
    getProjectAuthorizationUrl: vi
      .fn()
      .mockReturnValue('https://github.com/login/oauth/authorize?state=xyz'),
    exchangeCodeForTokenWithRedirect: vi.fn().mockResolvedValue('gh-token'),
    getUserInfo: vi.fn().mockResolvedValue({
      id: 1,
      login: 'user',
      email: 'user@example.com',
      name: 'User',
      avatar_url: 'https://avatars.github.com/1',
    }),
  };
  const grant = {
    signApiKeyToken: vi.fn().mockResolvedValue('fake-jwt-token'),
    signProjectAppToken: vi.fn().mockResolvedValue('fake-project-app-jwt'),
    getGrantedScopeSlugs: overrides?.getGrantedScopeSlugs ?? vi.fn().mockResolvedValue([]),
  };
  const email = { sendProjectOAuthMagicLink: vi.fn().mockResolvedValue(undefined) };
  const users = {
    getUsers: vi.fn().mockResolvedValue({ users: [], totalCount: 0, hasNextPage: false }),
  };
  const userAuthenticationMethods = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
  };
  const usersScopeCacheUpdater = {
    addUserIdToScopeCache: vi.fn().mockResolvedValue(undefined),
  };

  const projectOAuthHandler = new ProjectOAuthHandler(
    projectApps as never,
    projectPermissions as never,
    projectUsers as never,
    userRoles as never,
    accountProjects as never,
    organizationProjects as never,
    accounts as never,
    organizationUsers as never,
    authHandler as never,
    githubOAuth as never,
    grant as never,
    cache,
    email as never,
    users as never,
    userAuthenticationMethods as never,
    usersScopeCacheUpdater as never
  );

  return {
    grant: grant as never,
    user: null,
    handlers: {
      projectOAuth: projectOAuthHandler,
      auth: { login: vi.fn(), register: vi.fn() } as never,
    } as never,
    resourceResolvers: {} as never,
    requestLogger: {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    } as never,
    origin: 'https://api.example.com',
    locale: 'en',
    userAgent: null,
    ipAddress: null,
    requestBaseUrl: 'https://api.example.com',
  } as RequestContext;
}

describe('Project OAuth integration', () => {
  let cache: ReturnType<typeof CacheFactory.createEntityCache>;
  let app: express.Express;

  beforeEach(async () => {
    vi.clearAllMocks();
    cache = CacheFactory.createEntityCache({ strategy: 'memory' });
    const context = buildProjectOAuthContext(cache);
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRoutes(context));
    app.use(errorHandler);
  });

  afterEach(async () => {
    await CacheFactory.disconnect(cache);
  });

  describe('GET /api/auth/project/authorize', () => {
    it('returns 302 with Location to GitHub when provider=github', async () => {
      const res = await request(app)
        .get('/api/auth/project/authorize')
        .query({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://example.com/callback',
          state: 'test-state',
          provider: UserAuthenticationMethodProvider.Github,
        })
        .expect(302);

      expect(res.headers.location).toContain('github.com');
      expect(res.headers.location).toBeDefined();
    });

    it('returns 302 with Location to email entry URL when provider=email', async () => {
      const res = await request(app)
        .get('/api/auth/project/authorize')
        .query({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://example.com/callback',
          state: 'test-state',
          provider: UserAuthenticationMethodProvider.Email,
        })
        .expect(302);

      expect(res.headers.location).toContain('/en/auth/project/email');
      expect(res.headers.location).toContain('client_id=');
      expect(res.headers.location).toContain('redirect_uri=');
      expect(res.headers.location).toContain('state=');
    });

    it('returns 400 when redirect_uri is not in allowlist', async () => {
      await request(app)
        .get('/api/auth/project/authorize')
        .query({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://evil.com/callback',
          state: 'test-state',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/project/email/request', () => {
    it('returns 202 for valid request', async () => {
      const res = await request(app)
        .post('/api/auth/project/email/request')
        .send({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://example.com/callback',
          state: 'state-123',
          email: 'user@example.com',
        })
        .expect(202);

      expect(res.status).toBe(202);
    });

    it('returns 202 when state is omitted (e.g. direct link to email page)', async () => {
      const res = await request(app)
        .post('/api/auth/project/email/request')
        .send({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://example.com/callback',
          email: 'user@example.com',
        })
        .expect(202);
      expect(res.status).toBe(202);
    });

    it('returns 400 when redirect_uri is not allowed', async () => {
      await request(app)
        .post('/api/auth/project/email/request')
        .send({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://evil.com/cb',
          state: 'state-123',
          email: 'user@example.com',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/project/callback (email flow)', () => {
    it('returns 302 with Location to consent page when valid token and state in cache', async () => {
      const oneTimeToken = 'test-one-time-token-123';
      const stateId = 'state-456';
      const key = `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${oneTimeToken}` as never;
      await cache.oauth.set(
        key,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
          stateId,
          email: 'user@example.com',
        },
        600
      );

      const res = await request(app)
        .get('/api/auth/project/callback')
        .query({ token: oneTimeToken, state: stateId })
        .expect(302);

      expect(res.headers.location).toContain('/en/auth/project/consent');
      expect(res.headers.location).toContain('consent_token=');
    });

    it('redirects to frontend error when token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/project/callback')
        .query({ token: 'invalid-token', state: 'some-state' })
        .expect(302);

      expect(res.headers.location).toContain(mockConfig.security.frontendUrl);
      expect(res.headers.location).toContain('error=');
    });

    it('redirects to entry URL with client_id, redirect_uri, state and error when state is in cache and callback fails', async () => {
      const stateId = 'entry-state-999';
      const stateKey = `${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}` as never;
      await cache.oauth.set(
        stateKey,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
        },
        600
      );

      const res = await request(app)
        .get('/api/auth/project/callback')
        .query({ token: 'invalid-token', state: stateId })
        .expect(302);

      expect(res.headers.location).toContain('/auth/project');
      expect(res.headers.location).toContain('client_id=');
      expect(res.headers.location).toContain('redirect_uri=');
      expect(res.headers.location).toContain('state=');
      expect(res.headers.location).toContain('error=');
    });

    it('returns 400 when neither code nor token is provided', async () => {
      const res = await request(app)
        .get('/api/auth/project/callback')
        .query({ state: 'some-state' })
        .expect(400);

      expect(res.status).toBe(400);
    });

    it('returns 400 when both code and token are provided', async () => {
      const res = await request(app)
        .get('/api/auth/project/callback')
        .query({
          code: 'gh-code',
          token: 'email-token',
          state: 'some-state',
        })
        .expect(400);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/project/app-info', () => {
    it('returns 200 with name, enabledProviders, and scopes for valid client_id', async () => {
      const res = await request(app)
        .get('/api/auth/project/app-info')
        .query({ client_id: fixtureApp.clientId })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe(fixtureApp.name);
      expect(res.body.data.enabledProviders).toEqual(fixtureApp.enabledProviders);
      expect(Array.isArray(res.body.data.scopes)).toBe(true);
    });

    it('returns 404 when client_id is unknown', async () => {
      const cache404 = CacheFactory.createEntityCache({ strategy: 'memory' });
      try {
        const context404 = buildProjectOAuthContext(cache404, {
          getProjectAppByClientId: () => Promise.resolve(null),
        });
        const app404 = express();
        app404.use(express.json());
        app404.use('/api/auth', createAuthRoutes(context404));
        app404.use(errorHandler);
        await request(app404)
          .get('/api/auth/project/app-info')
          .query({ client_id: 'unknown-client-id' })
          .expect(404);
      } finally {
        await CacheFactory.disconnect(cache404);
      }
    });

    it('returns 400 when redirect_uri is provided and not in allowlist', async () => {
      await request(app)
        .get('/api/auth/project/app-info')
        .query({
          client_id: fixtureApp.clientId,
          redirect_uri: 'https://evil.com/callback',
        })
        .expect(400);
    });
  });

  describe('GET /api/auth/project/consent-info', () => {
    it('returns 401 when consent_token is invalid or expired', async () => {
      await request(app)
        .get('/api/auth/project/consent-info')
        .query({ consent_token: 'invalid-consent-token' })
        .expect(401);
    });

    it('returns 200 with name and scopes when consent_token is valid', async () => {
      const consentToken = 'valid-consent-token-123';
      const consentKey = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as never;
      await cache.oauth.set(
        consentKey,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
          userId: 'user-1',
          scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-1:project-id-1:user-1' },
          signingScope: { tenant: Tenant.OrganizationProject, id: 'org-1:project-id-1' },
        },
        600
      );

      const res = await request(app)
        .get('/api/auth/project/consent-info')
        .query({ consent_token: consentToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(fixtureApp.name);
      expect(Array.isArray(res.body.data.scopes)).toBe(true);
    });

    it('returns granted scopes (user permissions ∩ request) for consent page', async () => {
      const consentToken = 'granted-scopes-token';
      const consentKey = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as never;
      await cache.oauth.set(
        consentKey,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
          userId: 'user-1',
          scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-1:project-id-1:user-1' },
          signingScope: { tenant: Tenant.OrganizationProject, id: 'org-1:project-id-1' },
          requestedScopeSlugs: ['read', 'write'],
        },
        600
      );

      const testContext = buildProjectOAuthContext(cache, {
        getGrantedScopeSlugs: vi.fn().mockResolvedValue(['read']),
        getScopeSlugLabelsForProject: vi
          .fn()
          .mockResolvedValue([{ slug: 'read', name: 'Read', description: 'Read access' }]),
      });
      const testApp = express();
      testApp.use(express.json());
      testApp.use('/api/auth', createAuthRoutes(testContext));
      testApp.use(errorHandler);

      const res = await request(testApp)
        .get('/api/auth/project/consent-info')
        .query({ consent_token: consentToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(fixtureApp.name);
      expect(res.body.data.scopes).toEqual([
        { slug: 'read', name: 'Read', description: 'Read access' },
      ]);
    });
  });

  describe('POST /api/auth/project/consent/approve', () => {
    it('returns 401 when consent_token is invalid or expired', async () => {
      await request(app)
        .post('/api/auth/project/consent/approve')
        .set('Content-Type', 'application/json')
        .send({ consent_token: 'invalid-token' })
        .expect(401);
    });

    it('returns 200 with redirectUrl containing access_token when consent_token is valid', async () => {
      const oneTimeToken = 'approve-flow-token';
      const stateId = 'approve-flow-state';
      const emailKey = `${PROJECT_OAUTH_EMAIL_TOKEN_KEY_PREFIX}${oneTimeToken}` as never;
      await cache.oauth.set(
        emailKey,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
          stateId,
          email: 'user@example.com',
        },
        600
      );

      const callbackRes = await request(app)
        .get('/api/auth/project/callback')
        .query({ token: oneTimeToken, state: stateId })
        .expect(302);

      const consentUrl = new URL(callbackRes.headers.location, 'http://localhost');
      const consentToken = consentUrl.searchParams.get('consent_token');
      expect(consentToken).toBeTruthy();

      const approveRes = await request(app)
        .post('/api/auth/project/consent/approve')
        .set('Content-Type', 'application/json')
        .send({ consent_token: consentToken })
        .expect(200);

      expect(approveRes.body.success).toBe(true);
      expect(approveRes.body.data.redirectUrl).toBeDefined();
      expect(approveRes.body.data.redirectUrl).toContain('https://example.com/callback');
      expect(approveRes.body.data.redirectUrl).toContain('access_token=');
      expect(approveRes.body.data.redirectUrl).toContain('token_type=Bearer');
    });
  });

  describe('POST /api/auth/project/consent/deny', () => {
    it('returns 401 when consent_token is invalid or expired', async () => {
      await request(app)
        .post('/api/auth/project/consent/deny')
        .set('Content-Type', 'application/json')
        .send({ consent_token: 'invalid-token' })
        .expect(401);
    });

    it('returns 200 with redirectUrl containing error=access_denied when consent_token is valid', async () => {
      const consentToken = 'deny-flow-consent-token';
      const consentKey = `${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}` as never;
      await cache.oauth.set(
        consentKey,
        {
          projectAppId: fixtureApp.id,
          redirectUri: 'https://example.com/callback',
          clientState: 'deny-client-state',
          userId: 'user-1',
          scope: { tenant: Tenant.OrganizationProjectUser, id: 'org-1:project-id-1:user-1' },
          signingScope: { tenant: Tenant.OrganizationProject, id: 'org-1:project-id-1' },
        },
        600
      );

      const res = await request(app)
        .post('/api/auth/project/consent/deny')
        .set('Content-Type', 'application/json')
        .send({ consent_token: consentToken })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.redirectUrl).toBeDefined();
      expect(res.body.data.redirectUrl).toContain('https://example.com/callback');
      expect(res.body.data.redirectUrl).toContain('error=access_denied');
      expect(res.body.data.redirectUrl).toContain('state=');
    });
  });
});
