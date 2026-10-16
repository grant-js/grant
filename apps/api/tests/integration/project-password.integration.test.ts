/**
 * Integration tests for the project-app `password` provider over HTTP (ADR 0011 slice 4):
 * authorize with the opt-in provider, POST /project/password, POST /project/password/mfa.
 *
 * Minimal Express app with the auth routes and the real `ProjectOAuthHandler`, the real
 * credential and lockout services (over in-memory repositories) and an in-memory cache;
 * the rest of the handler's collaborators are mocks.
 */
import { CacheFactory } from '@grantjs/cache';
import type { CredentialLockoutPolicy } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import express from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_OAUTH_STATE_KEY_PREFIX } from '@/constants/cache.constants';

import { FakeCredentialRepository, FakeLockoutRepository } from '../helpers/credential-fakes';

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return { ...actual, hashSecret: (value: string) => actual.hashSecret(value, 4) };
});

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      emailEntryUrl: 'https://app.example.com/auth/project/email',
      consentUrl: 'https://app.example.com/auth/project/consent',
      requireByoSocial: false,
      stateTtlSeconds: 600,
      emailTokenTtlSeconds: 600,
      consentTtlSeconds: 600,
      authorizationCodeTtlSeconds: 60,
      refreshTokenExpirationDays: 30,
    },
    auth: { maxFailedLoginAttempts: 3, lockoutDurationMinutes: 15, minAalAtLogin: 'aal1' },
    app: { url: 'https://api.example.com', isDevelopment: false, nodeEnv: 'test', version: 'test' },
    jwt: { accessTokenExpirationMinutes: 15 },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32, bcryptRounds: 4 },
    githubOAuth: {
      isConfigured: () => true,
      projectCallbackUrl: 'https://api.example.com/api/auth/project/callback',
      callbackUrl: 'https://api.example.com/api/auth/callback',
    },
    security: {
      frontendUrl: 'https://app.example.com',
      enableRateLimit: true,
      rateLimitMax: 1000,
      rateLimitWindowMinutes: 15,
      rateLimitAuthMax: 100,
      rateLimitAuthWindowMinutes: 15,
      rateLimitPerTenantEnabled: false,
    },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en', 'de'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({
  config: mockConfig,
  SOCIAL_OAUTH_PROVIDERS: [
    UserAuthenticationMethodProvider.Github,
    UserAuthenticationMethodProvider.Google,
  ],
}));

vi.mock('@/lib/headers.lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/headers.lib')>()),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

const { ProjectOAuthHandler } = await import('@/handlers/project-oauth.handler');
const { errorHandler } = await import('@/middleware/error.middleware');
const { rateLimitMiddleware } = await import('@/middleware/rate-limit.middleware');
const { createAuthRoutes } = await import('@/rest/routes/auth.routes');
const { CredentialLockoutService } = await import('@/services/credential-lockouts.service');
const { CredentialService } = await import('@/services/credentials.service');

const PASSWORD = 'correct horse battery staple';
const REDIRECT_URI = 'https://example.com/callback';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';
const USER = 'user-1';
const fixtureApp = {
  id: 'app-id-1',
  clientId: 'client-uuid-1',
  projectId: 'project-id-1',
  redirectUris: [REDIRECT_URI],
  enabledProviders: ['password'] as string[],
  scopes: null as string[] | null,
  name: 'Test App',
};

const noopAudit = () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logSoftDelete: vi.fn(),
  logHardDelete: vi.fn(),
  logAction: vi.fn(),
});

function build(cache: ReturnType<typeof CacheFactory.createEntityCache>) {
  const projectCredentials = new FakeCredentialRepository();
  const lockoutRepo = new FakeLockoutRepository();
  const policy: CredentialLockoutPolicy = {
    maxAttempts: 3,
    windowMs: 15 * 60_000,
    lockDurationMs: 15 * 60_000,
  };
  const lockouts = new CredentialLockoutService(
    { platform: lockoutRepo as never, project: lockoutRepo },
    policy
  );
  const credentials = new CredentialService(
    { platform: new FakeCredentialRepository(), project: projectCredentials },
    { platform: noopAudit(), project: noopAudit() },
    lockouts
  );
  const userMfa = {
    hasActiveMfaEnrollment: vi.fn().mockResolvedValue(false),
    verifyTotp: vi.fn().mockResolvedValue({ factorId: 'f', verified: false }),
    verifyRecoveryCode: vi.fn().mockResolvedValue(false),
  };
  const projectApps = {
    getProjectAppByClientId: vi.fn().mockResolvedValue(fixtureApp),
    getProjectAppById: vi.fn().mockResolvedValue(fixtureApp),
    getClientSecretHash: vi.fn().mockResolvedValue(null),
  };
  const projectUsers = {
    getProjectUsers: vi.fn().mockResolvedValue([{ userId: USER, projectId: fixtureApp.projectId }]),
    syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
  };
  const userAuthenticationMethods = {
    getUserAuthenticationMethodByProvider: vi
      .fn()
      .mockImplementation(async (provider: string, providerId: string) =>
        provider === 'email' && providerId === 'member@example.com' ? { userId: USER } : null
      ),
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
  };
  const handler = new ProjectOAuthHandler(
    projectApps as never,
    { getProjects: vi.fn().mockResolvedValue({ projects: [], totalCount: 0 }) } as never,
    { getScopeSlugLabelsForProject: vi.fn().mockResolvedValue([]) } as never,
    projectUsers as never,
    { addUserRole: vi.fn() } as never,
    { getAccountProject: vi.fn().mockRejectedValue(new Error('not account')) } as never,
    { getOrganizationProject: vi.fn().mockResolvedValue({ organizationId: 'org-1' }) } as never,
    {} as never,
    { getOrganizationUsers: vi.fn().mockResolvedValue([{ userId: USER, roleId: 'r' }]) } as never,
    {
      resolveUserIdFromEmailForProject: vi.fn(),
      resolveUserIdFromOAuthForProject: vi.fn(),
    } as never,
    { isConfigured: vi.fn().mockResolvedValue(false) } as never,
    { isConfigured: vi.fn().mockResolvedValue(false) } as never,
    { listByProject: vi.fn().mockResolvedValue([]), getDecryptedCredentials: vi.fn() } as never,
    { getGrantedScopeSlugs: vi.fn().mockResolvedValue([]) } as never,
    cache,
    {} as never,
    { getUsers: vi.fn() } as never,
    userAuthenticationMethods as never,
    { addUserIdToScopeCache: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
    credentials,
    lockouts,
    userMfa as never
  );
  return { handler, credentials, projectApps, projectUsers, userMfa, lockoutRepo };
}

describe('project-app password provider over HTTP', () => {
  let cache: ReturnType<typeof CacheFactory.createEntityCache>;
  let parts: ReturnType<typeof build>;
  let app: express.Express;
  let store: InstanceType<(typeof import('@grantjs/cache/memory'))['InMemoryCacheAdapter']>;

  async function seedCredential(password = PASSWORD) {
    await parts.credentials.setPassword({
      scope: { scope: 'project', projectId: fixtureApp.projectId },
      userId: USER,
      password,
      source: 'cdm-import',
    });
  }

  /** The hosted flow: authorize with provider=password, then read the state id it passes on. */
  async function authorize() {
    const res = await request(app)
      .get('/api/auth/project/authorize')
      .query({
        client_id: fixtureApp.clientId,
        redirect_uri: REDIRECT_URI,
        state: 'client-state',
        provider: 'password',
        code_challenge: CHALLENGE,
        code_challenge_method: 'S256',
      })
      .expect(302);
    return new URL(res.headers.location).searchParams.get('state')!;
  }

  const signIn = (body: Record<string, unknown>) =>
    request(app)
      .post('/api/auth/project/password')
      .send({
        client_id: fixtureApp.clientId,
        redirect_uri: REDIRECT_URI,
        email: 'member@example.com',
        password: PASSWORD,
        ...body,
      });

  beforeEach(async () => {
    vi.clearAllMocks();
    mockConfig.auth.minAalAtLogin = 'aal1';
    mockConfig.security.rateLimitAuthMax = 100;
    const { InMemoryCacheAdapter } = await import('@grantjs/cache/memory');
    store = new InMemoryCacheAdapter();
    cache = CacheFactory.createEntityCache({ strategy: 'memory' });
    parts = build(cache);
    app = express();
    app.use(express.json());
    app.use(rateLimitMiddleware(store));
    app.use(
      '/api/auth',
      createAuthRoutes({
        grant: {} as never,
        user: null,
        handlers: { projectOAuth: parts.handler, auth: {} } as never,
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
      } as never)
    );
    app.use(errorHandler);
  });

  afterEach(async () => {
    await store.clear();
    await CacheFactory.disconnect(cache);
  });

  describe('GET /api/auth/project/authorize?provider=password', () => {
    it('redirects to the hosted password view when the app names password', async () => {
      const stateId = await authorize();
      expect(stateId).toBeTruthy();
      expect(await cache.oauth.get(`${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}`)).toMatchObject({
        provider: 'password',
        codeChallenge: CHALLENGE,
      });
    });

    it('is a 400 for an app with an empty provider list (opt-in only) or one naming others', async () => {
      for (const list of [[], ['email', 'github']]) {
        parts.projectApps.getProjectAppByClientId.mockResolvedValue({
          ...fixtureApp,
          enabledProviders: list,
        });
        await request(app)
          .get('/api/auth/project/authorize')
          .query({
            client_id: fixtureApp.clientId,
            redirect_uri: REDIRECT_URI,
            provider: 'password',
            code_challenge: CHALLENGE,
          })
          .expect(400);
      }
    });
  });

  describe('POST /api/auth/project/password', () => {
    it('returns the consent redirect on success', async () => {
      await seedCredential();
      const state = await authorize();

      const res = await signIn({ state }).expect(200);

      expect(res.body).toMatchObject({ success: true, data: { status: 'authenticated' } });
      const redirect = new URL(res.body.data.redirectUrl);
      expect(redirect.pathname).toBe('/en/auth/project/consent');
      expect(redirect.searchParams.get('consent_token')).toBeTruthy();
      expect(JSON.stringify(res.body)).not.toContain(PASSWORD);
    });

    it('answers every identifier or password failure with the same 401 body', async () => {
      await seedCredential();
      const state = await authorize();

      const bodies: unknown[] = [];
      // unknown address, wrong password, then a non-member (right password)
      const unknown = await signIn({ state, email: 'nobody@example.com' }).expect(401);
      const wrong = await signIn({ state, password: 'a wrong one' }).expect(401);
      parts.projectUsers.getProjectUsers.mockResolvedValue([]);
      const nonMember = await signIn({ state }).expect(401);
      bodies.push(unknown.body, wrong.body, nonMember.body);

      const strip = (b: { error?: unknown } & Record<string, unknown>) => JSON.stringify(b);
      expect(strip(bodies[1] as never)).toBe(strip(bodies[0] as never));
      expect(strip(bodies[2] as never)).toBe(strip(bodies[0] as never));
      expect(JSON.stringify(bodies)).not.toMatch(/member@example|nobody@example|a wrong one/);
    });

    it('locks after the configured failures, across separate requests, with the same 401', async () => {
      await seedCredential();
      const state = await authorize();
      const first = await signIn({ state, password: 'wrong-0' }).expect(401);
      await signIn({ state, password: 'wrong-1' }).expect(401);
      await signIn({ state, password: 'wrong-2' }).expect(401);

      const locked = await signIn({ state }).expect(401);
      expect(JSON.stringify(locked.body)).toBe(JSON.stringify(first.body));
    });

    it('is a 400 (not a 401) when the app does not name password', async () => {
      await seedCredential();
      const state = await authorize();
      parts.projectApps.getProjectAppByClientId.mockResolvedValue({
        ...fixtureApp,
        enabledProviders: [],
      });
      await signIn({ state }).expect(400);
    });

    it('is a 400 (not the credentials 401) when the state is missing or expired', async () => {
      await seedCredential();
      await signIn({ state: 'never-issued' }).expect(400);
    });

    it('rejects a malformed body naming the field, never echoing the password', async () => {
      const res = await signIn({ email: 'not-an-email', password: 'topsecretvalue' }).expect(400);
      expect(JSON.stringify(res.body)).not.toContain('topsecretvalue');
      expect(res.body.details.map((d: { field: string }) => d.field)).toContain('email');
    });

    it('is rate limited per client address on the sensitive path', async () => {
      await seedCredential();
      const state = await authorize();
      mockConfig.security.rateLimitAuthMax = 3; // the authorize above spent one
      const statuses: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        statuses.push((await signIn({ state, password: `wrong-${i}` })).status);
      }
      expect(statuses.slice(0, 2)).toEqual([401, 401]);
      expect(statuses.slice(2)).toEqual([429, 429]);
    });
  });

  describe('POST /api/auth/project/password/mfa', () => {
    beforeEach(() => {
      mockConfig.auth.minAalAtLogin = 'aal2';
      parts.userMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    });

    it('holds the sign-in for a code, then returns the consent redirect', async () => {
      await seedCredential();
      const state = await authorize();

      const step1 = await signIn({ state }).expect(200);
      expect(step1.body.data).toMatchObject({ status: 'mfa_required' });
      expect(step1.body.data).not.toHaveProperty('redirectUrl');

      await request(app)
        .post('/api/auth/project/password/mfa')
        .send({ mfa_token: step1.body.data.mfaToken, code: '000000' })
        .expect(401);

      parts.userMfa.verifyTotp.mockResolvedValue({ factorId: 'f', verified: true });
      const step2 = await request(app)
        .post('/api/auth/project/password/mfa')
        .send({ mfa_token: step1.body.data.mfaToken, code: '123456' })
        .expect(200);
      expect(step2.body.data.status).toBe('authenticated');
      expect(new URL(step2.body.data.redirectUrl).searchParams.get('consent_token')).toBeTruthy();
    });

    it('is a 400 for an unknown or expired challenge', async () => {
      await request(app)
        .post('/api/auth/project/password/mfa')
        .send({ mfa_token: 'nope', code: '123456' })
        .expect(400);
    });
  });
});
