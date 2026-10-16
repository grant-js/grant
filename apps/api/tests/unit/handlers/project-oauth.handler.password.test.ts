/**
 * Unit tests: ProjectOAuthHandler, project-app `password` provider (ADR 0011 slice 4).
 *
 * Runs the real `CredentialService`, the real `CredentialLockoutService` and the real
 * verifier on in-memory repositories (the repositories' SQL is covered against PostgreSQL
 * in `credentials.postgres.integration.test.ts` and
 * `project-password.postgres.integration.test.ts`); everything else the handler touches is
 * a mock. Each `signInWithProjectPassword` call stands for one HTTP request.
 */
import type { CredentialLockoutPolicy } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PROJECT_OAUTH_CODE_KEY_PREFIX,
  PROJECT_OAUTH_CONSENT_KEY_PREFIX,
  PROJECT_OAUTH_MFA_KEY_PREFIX,
  PROJECT_OAUTH_STATE_KEY_PREFIX,
} from '@/constants/cache.constants';

import { FakeCredentialRepository, FakeLockoutRepository } from '../../helpers/credential-fakes';

const verifySecretSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    hashSecret: (value: string) => actual.hashSecret(value, 4),
    verifySecret: (value: string, hash: string) => {
      verifySecretSpy(value, hash);
      return actual.verifySecret(value, hash);
    },
  };
});

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: {
      emailEntryUrl: 'https://app.example.com/auth/project/email',
      consentUrl: 'https://app.example.com/auth/project/consent',
      stateTtlSeconds: 600,
      emailTokenTtlSeconds: 600,
      consentTtlSeconds: 600,
      authorizationCodeTtlSeconds: 60,
      refreshTokenExpirationDays: 30,
      requireByoSocial: false,
    },
    auth: { maxFailedLoginAttempts: 3, lockoutDurationMinutes: 15, minAalAtLogin: 'aal1' },
    app: { url: 'https://api.example.com', isDevelopment: false, nodeEnv: 'test', version: 'test' },
    jwt: { accessTokenExpirationMinutes: 15 },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32, bcryptRounds: 4 },
    githubOAuth: {
      projectCallbackUrl: 'https://api.example.com/api/auth/project/callback',
      callbackUrl: 'https://api.example.com/api/auth/callback',
    },
    security: { frontendUrl: 'https://app.example.com' },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en', 'de'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const { ProjectOAuthHandler } = await import('@/handlers/project-oauth.handler');
const { CredentialService } = await import('@/services/credentials.service');
const { CredentialLockoutService } = await import('@/services/credential-lockouts.service');

const RFC_PKCE = {
  challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
};
const REDIRECT_URI = 'https://example.com/callback';
const PASSWORD = 'correct horse battery staple';
const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 15;

const USER = 'user-1';
const PROJECT = 'project-id';
const OTHER_PROJECT = 'project-other';

const validApp = {
  id: 'app-id',
  clientId: 'client-uuid',
  projectId: PROJECT,
  redirectUris: [REDIRECT_URI],
  enabledProviders: ['password'] as string[] | null,
  scopes: null as string[] | null,
  name: 'Test App',
};

const auditLogger = () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logSoftDelete: vi.fn(),
  logHardDelete: vi.fn(),
  logAction: vi.fn(),
});

// One in-memory cache standing for Redis, so state, consent and code survive between steps.
const cacheStore = new Map<string, unknown>();
const cacheOauth = {
  set: vi.fn(async (key: string, value: unknown) => {
    cacheStore.set(key, JSON.parse(JSON.stringify(value)));
  }),
  get: vi.fn(async (key: string) => cacheStore.get(key) ?? null),
  delete: vi.fn(async (key: string) => {
    cacheStore.delete(key);
  }),
};

const mockProjectApps = {
  getProjectAppByClientId: vi.fn(),
  getProjectAppById: vi.fn(),
  getClientSecretHash: vi.fn(),
};
const mockProjects = {
  getProjects: vi.fn().mockResolvedValue({ projects: [], totalCount: 0, hasNextPage: false }),
};
const mockProjectUsers = {
  getProjectUsers: vi.fn(),
  addProjectUser: vi.fn(),
  syncProjectUserSearchDocument: vi.fn().mockResolvedValue(undefined),
};
const mockUserRoles = { addUserRole: vi.fn() };
const mockAccountProjects = { getAccountProject: vi.fn() };
const mockOrganizationProjects = { getOrganizationProject: vi.fn() };
const mockOrganizationUsers = { getOrganizationUsers: vi.fn() };
const mockAuthHandler = {
  resolveUserIdFromOAuthForProject: vi.fn(),
  resolveUserIdFromEmailForProject: vi.fn(),
};
const mockGrant = { getGrantedScopeSlugs: vi.fn() };
const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
};
const mockUserMfa = {
  hasActiveMfaEnrollment: vi.fn(),
  verifyTotp: vi.fn(),
  verifyRecoveryCode: vi.fn(),
};

let clock = new Date('2026-10-16T10:00:00.000Z');
let platformCredentials: FakeCredentialRepository;
let projectCredentials: FakeCredentialRepository;
let lockoutRepo: FakeLockoutRepository;
let credentialService: InstanceType<typeof CredentialService>;

function createHandler() {
  platformCredentials = new FakeCredentialRepository();
  projectCredentials = new FakeCredentialRepository();
  lockoutRepo = new FakeLockoutRepository();
  const policy: CredentialLockoutPolicy = {
    maxAttempts: MAX_ATTEMPTS,
    windowMs: LOCK_MINUTES * 60_000,
    lockDurationMs: LOCK_MINUTES * 60_000,
  };
  // The service inside `credentials` and the sign-in's own lockout service are two
  // instances over one store, as production wires them (the latter on the pool).
  credentialService = new CredentialService(
    { platform: platformCredentials, project: projectCredentials },
    { platform: auditLogger(), project: auditLogger() },
    new CredentialLockoutService(
      { platform: lockoutRepo as never, project: lockoutRepo },
      policy,
      () => clock
    )
  );
  const signInLockouts = new CredentialLockoutService(
    { platform: lockoutRepo as never, project: lockoutRepo },
    policy,
    () => clock
  );
  return new ProjectOAuthHandler(
    mockProjectApps as never,
    mockProjects as never,
    { getScopeSlugLabelsForProject: vi.fn().mockResolvedValue([]) } as never,
    mockProjectUsers as never,
    mockUserRoles as never,
    mockAccountProjects as never,
    mockOrganizationProjects as never,
    {} as never,
    mockOrganizationUsers as never,
    mockAuthHandler as never,
    { isConfigured: vi.fn().mockResolvedValue(false) } as never,
    { isConfigured: vi.fn().mockResolvedValue(false) } as never,
    { listByProject: vi.fn().mockResolvedValue([]) } as never,
    mockGrant as never,
    { oauth: cacheOauth } as never,
    {} as never,
    { getUsers: vi.fn() } as never,
    mockUserAuthenticationMethods as never,
    { addUserIdToScopeCache: vi.fn().mockResolvedValue(undefined) } as never,
    {} as never,
    credentialService,
    signInLockouts,
    mockUserMfa as never
  );
}

async function seedProjectCredential(userId = USER, password = PASSWORD, projectId = PROJECT) {
  await credentialService.setPassword({
    scope: { scope: 'project', projectId },
    userId,
    password,
    source: 'cdm-import',
  });
}

function seedState(overrides: Record<string, unknown> = {}, stateId = 'state-1') {
  cacheStore.set(`${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}`, {
    projectAppId: validApp.id,
    redirectUri: REDIRECT_URI,
    clientState: 'client-state',
    provider: 'password',
    codeChallenge: RFC_PKCE.challenge,
    codeChallengeMethod: 'S256',
    ...overrides,
  });
}

function signIn(
  handler: InstanceType<typeof ProjectOAuthHandler>,
  overrides: { email?: string; password?: string; stateId?: string } = {}
) {
  return handler.signInWithProjectPassword({
    clientId: validApp.clientId,
    redirectUri: REDIRECT_URI,
    stateId: overrides.stateId ?? 'state-1',
    email: overrides.email ?? 'Member@Example.com',
    password: overrides.password ?? PASSWORD,
  });
}

/** What a caller can observe of a failure: the class, the message, the HTTP-relevant name. */
async function failureOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const e = error as Error;
    return { name: e.constructor.name, message: e.message };
  }
  throw new Error('expected the sign-in to fail');
}

const GENERIC = { name: 'AuthenticationError', message: 'Invalid credentials' };

describe('ProjectOAuthHandler password provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    clock = new Date('2026-10-16T10:00:00.000Z');
    mockConfig.auth.minAalAtLogin = 'aal1';
    mockProjectApps.getProjectAppByClientId.mockResolvedValue(validApp);
    mockProjectApps.getProjectAppById.mockResolvedValue(validApp);
    mockProjects.getProjects.mockResolvedValue({ projects: [], totalCount: 0, hasNextPage: false });
    // Known address -> USER, through the Email method only; anything else is unknown.
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockImplementation(
      async (provider: string, providerId: string) =>
        provider === UserAuthenticationMethodProvider.Email && providerId === 'member@example.com'
          ? { userId: USER, provider, providerId }
          : null
    );
    mockProjectUsers.getProjectUsers.mockResolvedValue([{ userId: USER, projectId: PROJECT }]);
    mockAccountProjects.getAccountProject.mockRejectedValue(new Error('not account'));
    mockOrganizationProjects.getOrganizationProject.mockResolvedValue({ organizationId: 'org-id' });
    mockOrganizationUsers.getOrganizationUsers.mockResolvedValue([
      { userId: USER, roleId: 'role-1' },
    ]);
    mockGrant.getGrantedScopeSlugs.mockResolvedValue([]);
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
    mockUserMfa.verifyTotp.mockResolvedValue({ factorId: 'f', verified: false });
    mockUserMfa.verifyRecoveryCode.mockResolvedValue(false);
    verifySecretSpy.mockClear();
  });

  describe('opt-in: an empty provider list never enables password', () => {
    const authorize = (handler: InstanceType<typeof ProjectOAuthHandler>, provider: string) =>
      handler.initiateProjectAuthorize(
        validApp.clientId,
        REDIRECT_URI,
        'client-state',
        provider as never,
        undefined,
        undefined,
        { codeChallenge: RFC_PKCE.challenge, codeChallengeMethod: 'S256' }
      );

    it.each([[[]], [null]])(
      'refuses provider=password when enabledProviders is %j',
      async (list) => {
        mockProjectApps.getProjectAppByClientId.mockResolvedValue({
          ...validApp,
          enabledProviders: list,
        });
        const handler = createHandler();
        await expect(authorize(handler, 'password')).rejects.toThrow('not enabled for this app');
      }
    );

    it('refuses provider=password when the list names only other providers', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: ['email', 'github'],
      });
      const handler = createHandler();
      await expect(authorize(handler, 'password')).rejects.toThrow('not enabled for this app');
    });

    it('keeps an empty list meaning every other provider (email still authorizes)', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: [],
      });
      const handler = createHandler();
      const result = await authorize(handler, 'email');
      expect(new URL(result.authorizationUrl).pathname).toBe('/en/auth/project/email');
    });

    it('authorizes provider=password when the list names it, to the hosted password view', async () => {
      const handler = createHandler();
      const result = await authorize(handler, 'password');
      const url = new URL(result.authorizationUrl);
      expect(url.pathname).toBe('/en/auth/project/password');
      expect(url.searchParams.get('client_id')).toBe(validApp.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
      expect(url.searchParams.get('client_state')).toBe('client-state');
      const stateId = url.searchParams.get('state')!;
      expect(cacheStore.get(`${PROJECT_OAUTH_STATE_KEY_PREFIX}${stateId}`)).toMatchObject({
        provider: 'password',
        codeChallenge: RFC_PKCE.challenge,
      });
    });

    it('matches the list case-insensitively, as the hosted page does', async () => {
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: ['Password'],
      });
      const handler = createHandler();
      await expect(authorize(handler, 'password')).resolves.toBeDefined();
    });

    it('refuses the sign-in itself unless the app names password', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      for (const list of [[], null, ['email']]) {
        mockProjectApps.getProjectAppByClientId.mockResolvedValue({
          ...validApp,
          enabledProviders: list,
        });
        await expect(signIn(handler)).rejects.toThrow('not enabled for this app');
      }
      expect(lockoutRepo.recordCalls).toEqual([]);
    });
  });

  describe('sign-in success', () => {
    it('mints the consent step for the app (then the one-time code), never a platform session', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState({ requestedScopeSlugs: ['user:read'] });

      const result = await signIn(handler);

      expect(result.status).toBe('authenticated');
      const redirectUrl = new URL((result as { redirectUrl: string }).redirectUrl);
      expect(redirectUrl.pathname).toBe('/en/auth/project/consent');
      const consentToken = redirectUrl.searchParams.get('consent_token')!;
      expect(cacheStore.get(`${PROJECT_OAUTH_CONSENT_KEY_PREFIX}${consentToken}`)).toMatchObject({
        projectAppId: validApp.id,
        userId: USER,
        provider: 'password',
        redirectUri: REDIRECT_URI,
        clientState: 'client-state',
        requestedScopeSlugs: ['user:read'],
        codeChallenge: RFC_PKCE.challenge,
      });

      // The consent approval mints the same one-time authorization code as the magic link.
      const approved = await handler.handleProjectConsentApprove(consentToken);
      const code = new URL(approved.redirectUrl).searchParams.get('code')!;
      expect(cacheStore.get(`${PROJECT_OAUTH_CODE_KEY_PREFIX}${code}`)).toMatchObject({
        userId: USER,
        projectAppId: validApp.id,
        clientId: validApp.clientId,
        codeChallenge: RFC_PKCE.challenge,
      });
      expect(new URL(approved.redirectUrl).searchParams.get('state')).toBe('client-state');
    });

    it('creates no identity, no membership and does not mark the Email method verified', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();

      await signIn(handler);

      expect(mockAuthHandler.resolveUserIdFromEmailForProject).not.toHaveBeenCalled();
      expect(mockProjectUsers.addProjectUser).not.toHaveBeenCalled();
      expect(mockUserRoles.addUserRole).not.toHaveBeenCalled();
    });

    it('resolves the address through the Email method, lower-cased', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();

      await signIn(handler, { email: '  MEMBER@example.COM ' });

      expect(
        mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider
      ).toHaveBeenCalledWith(UserAuthenticationMethodProvider.Email, 'member@example.com');
    });

    it('clears the failure count and consumes the state', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();

      await signIn(handler);

      expect(lockoutRepo.rows.size).toBe(0);
      expect(cacheStore.has(`${PROJECT_OAUTH_STATE_KEY_PREFIX}state-1`)).toBe(false);
    });
  });

  describe('every identifier or password failure is the same answer', () => {
    // [description, arrange] -> each leaves the sign-in unable to succeed for its own reason.
    const scenarios: Array<
      [string, () => Promise<void> | void, { email?: string; password?: string }]
    > = [
      ['unknown address', () => undefined, { email: 'nobody@example.com' }],
      ['wrong password', () => undefined, { password: 'not the password' }],
      [
        'not a project member (credential row left behind)',
        () => {
          mockProjectUsers.getProjectUsers.mockResolvedValue([]);
        },
        {},
      ],
      [
        'member with no project credential',
        () => {
          projectCredentials.rows.length = 0;
        },
        {},
      ],
      [
        'a credential of another project only',
        async () => {
          projectCredentials.rows.length = 0;
          await seedProjectCredential(USER, PASSWORD, OTHER_PROJECT);
        },
        {},
      ],
      [
        'a platform credential only',
        async () => {
          projectCredentials.rows.length = 0;
          await credentialService.setPassword({
            scope: { scope: 'platform' },
            userId: USER,
            password: PASSWORD,
            source: 'register',
          });
        },
        {},
      ],
      ['an over-long password', () => undefined, { password: 'x'.repeat(5000) }],
    ];

    it.each(scenarios)(
      '%s: the generic failure, after one bcrypt compare',
      async (_name, arrange, input) => {
        const handler = createHandler();
        await seedProjectCredential();
        seedState();
        await arrange();
        verifySecretSpy.mockClear();

        expect(await failureOf(signIn(handler, input))).toEqual(GENERIC);
        expect(verifySecretSpy).toHaveBeenCalledTimes(1);
      }
    );

    it('does the same work for a locked credential, right password or not', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        await failureOf(signIn(handler, { password: 'wrong' }));
      }
      verifySecretSpy.mockClear();

      expect(await failureOf(signIn(handler))).toEqual(GENERIC);
      expect(verifySecretSpy).toHaveBeenCalledTimes(1);
    });

    it('never reads the platform credential for a project sign-in', async () => {
      const handler = createHandler();
      await credentialService.setPassword({
        scope: { scope: 'platform' },
        userId: USER,
        password: PASSWORD,
        source: 'register',
      });
      seedState();
      platformCredentials.findActiveCalls = 0;

      expect(await failureOf(signIn(handler))).toEqual(GENERIC);
      expect(platformCredentials.findActiveCalls).toBe(0);
    });

    it('does not put the password, the address or a hash into the error', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const error = await failureOf(signIn(handler, { password: 'my-secret-guess' }));
      expect(JSON.stringify(error)).not.toMatch(/my-secret-guess|member@example|\$2[aby]\$/i);
    });
  });

  describe('state is checked before any identifier', () => {
    it('rejects a missing, foreign or wrong-provider state', async () => {
      const handler = createHandler();
      await seedProjectCredential();

      await expect(signIn(handler)).rejects.toThrow('Invalid or expired state');

      seedState({ provider: 'email' });
      await expect(signIn(handler)).rejects.toThrow('Invalid or expired state');

      seedState({ projectAppId: 'another-app' });
      await expect(signIn(handler)).rejects.toThrow('Invalid or expired state');

      seedState({ redirectUri: 'https://example.com/other' });
      await expect(signIn(handler)).rejects.toThrow('Invalid or expired state');

      seedState({ codeChallenge: undefined });
      await expect(signIn(handler)).rejects.toThrow('Invalid or expired state');

      expect(lockoutRepo.recordCalls).toEqual([]);
      expect(
        mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider
      ).not.toHaveBeenCalled();
    });

    it('rejects a redirect_uri off the allowlist and an unknown client', async () => {
      const handler = createHandler();
      seedState();
      await expect(
        handler.signInWithProjectPassword({
          clientId: validApp.clientId,
          redirectUri: 'https://evil.example/cb',
          stateId: 'state-1',
          email: 'member@example.com',
          password: PASSWORD,
        })
      ).rejects.toThrow('redirect_uri is not allowed');

      mockProjectApps.getProjectAppByClientId.mockResolvedValue(null);
      await expect(signIn(handler)).rejects.toThrow('ProjectApp');
    });
  });

  describe('per-(project, user) lockout across separate requests', () => {
    it('locks after N failures and refuses even the right password, then recovers after the duration', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();

      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        expect(await failureOf(signIn(handler, { password: `wrong-${i}` }))).toEqual(GENERIC);
      }
      expect(lockoutRepo.rows.get(`${PROJECT}:${USER}`)?.lockedUntil).not.toBeNull();

      // Locked: the right password gets the same generic failure.
      expect(await failureOf(signIn(handler))).toEqual(GENERIC);

      // Still locked just before the end, free just after.
      clock = new Date(clock.getTime() + (LOCK_MINUTES * 60_000 - 1000));
      expect(await failureOf(signIn(handler))).toEqual(GENERIC);
      clock = new Date(clock.getTime() + 2000);
      await expect(signIn(handler)).resolves.toMatchObject({ status: 'authenticated' });
    });

    it('lets the Nth attempt succeed when the first N-1 failed, and clears the count', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
        await failureOf(signIn(handler, { password: `wrong-${i}` }));
      }
      await expect(signIn(handler)).resolves.toMatchObject({ status: 'authenticated' });
      expect(lockoutRepo.rows.size).toBe(0);
    });

    it('forgets failures older than the window', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
        await failureOf(signIn(handler, { password: `wrong-${i}` }));
      }
      clock = new Date(clock.getTime() + LOCK_MINUTES * 60_000 + 1000);
      await failureOf(signIn(handler, { password: 'wrong' }));
      expect(lockoutRepo.rows.get(`${PROJECT}:${USER}`)?.failedAttempts).toBe(1);
    });

    it('bounds the bcrypt verifications of overlapping guesses to the budget', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      verifySecretSpy.mockClear();

      const results = await Promise.allSettled(
        Array.from({ length: 12 }, (_, i) => signIn(handler, { password: `guess-${i}` }))
      );

      expect(results.every((r) => r.status === 'rejected')).toBe(true);
      // Every attempt does one compare; only the budget's worth reach the stored hash.
      const storedHash = projectCredentials.rows[0].hash;
      const againstStoredHash = verifySecretSpy.mock.calls.filter(
        ([, hash]) => hash === storedHash
      );
      expect(verifySecretSpy).toHaveBeenCalledTimes(12);
      expect(againstStoredHash.length).toBeLessThanOrEqual(MAX_ATTEMPTS);
    });

    it('counts a user who is not a member or holds no credential the same as one who does', async () => {
      const handler = createHandler();
      seedState();
      mockProjectUsers.getProjectUsers.mockResolvedValue([]);

      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        await failureOf(signIn(handler, { password: `wrong-${i}` }));
      }

      expect(lockoutRepo.rows.get(`${PROJECT}:${USER}`)?.lockedUntil).not.toBeNull();
    });

    it('keeps the budget per project and per user', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
        await failureOf(signIn(handler, { password: `wrong-${i}` }));
      }
      expect([...lockoutRepo.rows.keys()]).toEqual([`${PROJECT}:${USER}`]);
    });

    it('records on the sign-in lockout service, not on the one inside the credential service', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const durable = (handler as unknown as { credentialLockouts: { recordFailure: () => void } })
        .credentialLockouts;
      const spy = vi.spyOn(durable, 'recordFailure');
      await failureOf(signIn(handler, { password: 'wrong' }));
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('MFA at the ceremony (`minAalAtLogin: aal2` and an active enrolment)', () => {
    async function pendingMfa(handler: InstanceType<typeof ProjectOAuthHandler>) {
      const result = await signIn(handler);
      expect(result.status).toBe('mfa_required');
      return (result as { mfaToken: string }).mfaToken;
    }

    beforeEach(() => {
      mockConfig.auth.minAalAtLogin = 'aal2';
      mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    });

    it('holds the sign-in at a challenge instead of the consent step', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();

      const token = await pendingMfa(handler);

      expect(cacheStore.get(`${PROJECT_OAUTH_MFA_KEY_PREFIX}${token}`)).toMatchObject({
        userId: USER,
        projectAppId: validApp.id,
        attempts: 0,
      });
      const consentKeys = [...cacheStore.keys()].filter((k) =>
        k.startsWith(PROJECT_OAUTH_CONSENT_KEY_PREFIX)
      );
      expect(consentKeys).toEqual([]);
      // A password alone does not clear the counter.
      expect(lockoutRepo.rows.get(`${PROJECT}:${USER}`)?.failedAttempts).toBe(1);
    });

    it('completes with a valid TOTP code, then clears the count', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const token = await pendingMfa(handler);
      mockUserMfa.verifyTotp.mockResolvedValue({ factorId: 'f', verified: true });

      const result = await handler.verifyProjectPasswordMfa({ mfaToken: token, code: '123456' });

      expect(new URL(result.redirectUrl).pathname).toBe('/en/auth/project/consent');
      expect(mockUserMfa.verifyTotp).toHaveBeenCalledWith(USER, '123456');
      expect(cacheStore.has(`${PROJECT_OAUTH_MFA_KEY_PREFIX}${token}`)).toBe(false);
      expect(lockoutRepo.rows.size).toBe(0);
    });

    it('accepts a one-time recovery code', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const token = await pendingMfa(handler);
      mockUserMfa.verifyRecoveryCode.mockResolvedValue(true);

      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: token, code: 'abcd-efgh', method: 'recovery' })
      ).resolves.toHaveProperty('redirectUrl');
      expect(mockUserMfa.verifyRecoveryCode).toHaveBeenCalledWith(USER, 'abcd-efgh');
    });

    it('refuses a wrong code and discards the challenge after five', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      mockConfig.auth.maxFailedLoginAttempts = 100;
      try {
        const token = await pendingMfa(handler);

        for (let i = 0; i < 5; i += 1) {
          await expect(
            handler.verifyProjectPasswordMfa({ mfaToken: token, code: '000000' })
          ).rejects.toThrow('Invalid MFA code');
        }
        await expect(
          handler.verifyProjectPasswordMfa({ mfaToken: token, code: '000000' })
        ).rejects.toThrow('Invalid or expired MFA challenge');
        expect(cacheStore.has(`${PROJECT_OAUTH_MFA_KEY_PREFIX}${token}`)).toBe(false);
      } finally {
        mockConfig.auth.maxFailedLoginAttempts = MAX_ATTEMPTS;
      }
    });

    it('spends every code attempt from the (project, user) budget and locks', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const token = await pendingMfa(handler); // attempt 1 (the password)

      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: token, code: '000000' })
      ).rejects.toThrow('Invalid MFA code'); // attempt 2
      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: token, code: '000000' })
      ).rejects.toThrow('Invalid MFA code'); // attempt 3 reaches the limit

      // Locked: a valid code is refused too, and is not even tried.
      mockUserMfa.verifyTotp.mockClear();
      mockUserMfa.verifyTotp.mockResolvedValue({ factorId: 'f', verified: true });
      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: token, code: '123456' })
      ).rejects.toThrow('Invalid MFA code');
      expect(mockUserMfa.verifyTotp).not.toHaveBeenCalled();
    });

    it('treats a missing factor like a wrong code', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      const token = await pendingMfa(handler);
      mockUserMfa.verifyTotp.mockRejectedValue(new Error('MFA factor not set up'));

      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: token, code: '123456' })
      ).rejects.toThrow('Invalid MFA code');
    });

    it('rejects an unknown or expired challenge', async () => {
      const handler = createHandler();
      await expect(
        handler.verifyProjectPasswordMfa({ mfaToken: 'nope', code: '123456' })
      ).rejects.toThrow('Invalid or expired MFA challenge');
    });

    it('does not step up when the platform minimum is aal1', async () => {
      mockConfig.auth.minAalAtLogin = 'aal1';
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      await expect(signIn(handler)).resolves.toMatchObject({ status: 'authenticated' });
      expect(mockUserMfa.hasActiveMfaEnrollment).not.toHaveBeenCalled();
    });

    it('does not step up a user with no active enrolment', async () => {
      mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      await expect(signIn(handler)).resolves.toMatchObject({ status: 'authenticated' });
    });

    it('does not reach MFA for a wrong password', async () => {
      const handler = createHandler();
      await seedProjectCredential();
      seedState();
      expect(await failureOf(signIn(handler, { password: 'wrong' }))).toEqual(GENERIC);
      expect(mockUserMfa.hasActiveMfaEnrollment).not.toHaveBeenCalled();
    });
  });

  it('exposes enabledProviders as stored on the public app info (no implied password)', async () => {
    mockProjectApps.getProjectAppByClientId.mockResolvedValue({
      ...validApp,
      enabledProviders: [],
    });
    mockProjectApps.getProjectAppById.mockResolvedValue({ ...validApp, enabledProviders: [] });
    const handler = createHandler();
    const info = await handler.getProjectAppPublicInfo(validApp.clientId);
    expect(info.enabledProviders).toEqual([]);
  });
});
