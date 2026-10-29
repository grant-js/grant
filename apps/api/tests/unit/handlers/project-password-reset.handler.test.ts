/**
 * Unit tests: ProjectPasswordResetHandler, project-app "Forgot password?" (ADR 0011 slice 5).
 *
 * Runs the real `ProjectPasswordResetService`, `CredentialService` and
 * `CredentialLockoutService` on in-memory repositories (their SQL is covered against
 * PostgreSQL in `project-password-reset.postgres.integration.test.ts`); the app, member and
 * authentication-method services, the grant service, the mailer and the cache are mocks. The
 * transaction is emulated: the token store is snapshotted and restored when the transaction
 * fails, which is what the database does.
 */
import type { CredentialLockoutPolicy } from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PROJECT_OAUTH_STATE_KEY_PREFIX } from '@/constants/cache.constants';

import {
  FakeCredentialRepository,
  FakeLockoutRepository,
  passThroughPlatformConnection,
} from '../../helpers/credential-fakes';
import { FakeResetRepository } from '../../helpers/project-password-reset-fakes';

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    hashSecret: (value: string) => actual.hashSecret(value, 4),
  };
});

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    projectOAuth: { emailEntryUrl: 'https://app.example.com/auth/project/email' },
    auth: { maxFailedLoginAttempts: 3, lockoutDurationMinutes: 15 },
    app: { url: 'https://api.example.com', isDevelopment: false, nodeEnv: 'test', version: 'test' },
    token: { defaultValidityMinutes: 10, defaultTokenLength: 32, bcryptRounds: 4 },
    security: { frontendUrl: 'https://app.example.com' },
    i18n: { defaultLocale: 'en' as const, supportedLocales: ['en', 'de'] as const },
    logging: { level: 'silent' as const, prettyPrint: false },
  },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const { NotFoundError } = await import('@/lib/errors');
const { ProjectPasswordResetHandler } = await import('@/handlers/project-password-reset.handler');
const { CredentialService } = await import('@/services/credentials.service');
const { CredentialLockoutService } = await import('@/services/credential-lockouts.service');
const { ProjectPasswordResetService } = await import('@/services/project-password-resets.service');

const REDIRECT_URI = 'https://example.com/callback';
const NEW_PASSWORD = 'Zq7!mKp2#vXw';
const OLD_PASSWORD = 'Old-P4ssword!x';
const USER = 'user-1';
const OTHER_USER = 'user-2';
const PROJECT = 'project-id';
const OTHER_PROJECT = 'project-other';
const METHOD = 'method-1';
const EMAIL = 'member@example.com';

const MAX_REQUESTS = 2;
const TTL_MS = 30 * 60_000;
const WINDOW_MS = 60 * 60_000;
const LOCK_MINUTES = 15;

const validApp = {
  id: 'app-id',
  clientId: 'client-uuid',
  projectId: PROJECT,
  redirectUris: [REDIRECT_URI],
  enabledProviders: ['password'] as string[] | null,
  scopes: null as string[] | null,
  name: 'Docs',
};

const auditLogger = () => ({
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
  logSoftDelete: vi.fn(),
  logHardDelete: vi.fn(),
  logAction: vi.fn(),
});

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

const mockProjectApps = { getProjectAppByClientId: vi.fn() };
const mockProjectUsers = { getProjectUsers: vi.fn() };
const mockMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethod: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
};
const mockGrants = { revokeAllForUserInProject: vi.fn() };
const mockEmail = { sendProjectPasswordReset: vi.fn() };
const TX = { tx: true };

let clock = new Date('2026-10-16T10:00:00.000Z');
let resetRepo: FakeResetRepository;
let platformCredentials: FakeCredentialRepository;
let projectCredentials: FakeCredentialRepository;
let lockoutRepo: FakeLockoutRepository;
let credentialService: InstanceType<typeof CredentialService>;
let lockoutService: InstanceType<typeof CredentialLockoutService>;
let resetService: InstanceType<typeof ProjectPasswordResetService>;

/** A transaction that rolls the token store back when the work fails. */
const db = {
  withTransaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => {
    const snapshot = structuredClone(resetRepo.rows);
    try {
      return await work(TX);
    } catch (error) {
      resetRepo.rows = snapshot;
      throw error;
    }
  }),
};

function createHandler() {
  resetRepo = new FakeResetRepository();
  platformCredentials = new FakeCredentialRepository();
  projectCredentials = new FakeCredentialRepository();
  lockoutRepo = new FakeLockoutRepository();
  const policy: CredentialLockoutPolicy = {
    maxAttempts: 3,
    windowMs: LOCK_MINUTES * 60_000,
    lockDurationMs: LOCK_MINUTES * 60_000,
  };
  lockoutService = new CredentialLockoutService(
    { platform: lockoutRepo as never, project: lockoutRepo },
    policy,
    passThroughPlatformConnection as never,
    () => clock
  );
  credentialService = new CredentialService(
    { platform: platformCredentials, project: projectCredentials },
    { platform: auditLogger(), project: auditLogger() },
    lockoutService,
    passThroughPlatformConnection as never,
    { publishPasswordSet: vi.fn().mockResolvedValue(undefined) } as never
  );
  resetService = new ProjectPasswordResetService(
    resetRepo,
    { tokenTtlMs: TTL_MS, maxRequests: MAX_REQUESTS, windowMs: WINDOW_MS },
    () => clock
  );
  return new ProjectPasswordResetHandler(
    mockProjectApps as never,
    mockProjectUsers as never,
    mockMethods as never,
    credentialService,
    lockoutService,
    resetService,
    mockGrants as never,
    mockEmail as never,
    { oauth: cacheOauth } as never,
    db as never
  );
}

const request = (
  handler: InstanceType<typeof ProjectPasswordResetHandler>,
  overrides: Partial<{ email: string; stateId: string | null; locale: string | null }> = {}
) =>
  handler.requestReset({
    clientId: validApp.clientId,
    redirectUri: REDIRECT_URI,
    email: overrides.email ?? ' Member@Example.com ',
    stateId: overrides.stateId,
    locale: overrides.locale,
  });

const complete = (
  handler: InstanceType<typeof ProjectPasswordResetHandler>,
  token: string,
  password = NEW_PASSWORD
) =>
  handler.completeReset({
    clientId: validApp.clientId,
    redirectUri: REDIRECT_URI,
    token,
    password,
  });

/** Request a link for the member and return the token the email carried. */
async function requestedToken(handler: InstanceType<typeof ProjectPasswordResetHandler>) {
  mockEmail.sendProjectPasswordReset.mockClear();
  await request(handler);
  return tokenOf(mockEmail.sendProjectPasswordReset.mock.calls.at(-1)![0].resetUrl);
}

const tokenOf = (resetUrl: string) =>
  new URLSearchParams(new URL(resetUrl).hash.replace(/^#/, '')).get('token')!;

async function failureOf(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    const e = error as Error;
    return { name: e.constructor.name, message: e.message };
  }
  throw new Error('expected the call to fail');
}

const INVALID_LINK = {
  name: 'BadRequestError',
  message: 'Invalid or expired password reset link',
};

describe('ProjectPasswordResetHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    clock = new Date('2026-10-16T10:00:00.000Z');
    mockProjectApps.getProjectAppByClientId.mockResolvedValue(validApp);
    mockMethods.getUserAuthenticationMethodByProvider.mockImplementation(
      async (provider: string, providerId: string) =>
        provider === UserAuthenticationMethodProvider.Email && providerId === EMAIL
          ? { id: METHOD, userId: USER, provider, providerId, isVerified: false }
          : null
    );
    mockMethods.getUserAuthenticationMethod.mockResolvedValue({
      id: METHOD,
      userId: USER,
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      isVerified: false,
    });
    mockMethods.updateUserAuthenticationMethod.mockResolvedValue(undefined);
    mockProjectUsers.getProjectUsers.mockImplementation(
      async (params: { projectId: string; userId: string }) =>
        params.projectId === PROJECT && params.userId === USER
          ? [{ userId: USER, projectId: PROJECT }]
          : []
    );
    mockGrants.revokeAllForUserInProject.mockResolvedValue(2);
    mockEmail.sendProjectPasswordReset.mockResolvedValue(undefined);
  });

  describe('requestReset', () => {
    it('sends one email to a member, branded with the app, to the address on the Email method', async () => {
      const handler = createHandler();

      await expect(request(handler, { locale: 'de' })).resolves.toBeUndefined();

      expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(1);
      const params = mockEmail.sendProjectPasswordReset.mock.calls[0][0];
      expect(params).toMatchObject({ to: EMAIL, appName: 'Docs', locale: 'de' });
      expect(params.validUntil).toBe(clock.getTime() + TTL_MS);
      const url = new URL(params.resetUrl);
      expect(url.origin + url.pathname).toBe(
        'https://app.example.com/de/auth/project/reset-password'
      );
      expect(url.searchParams.get('client_id')).toBe(validApp.clientId);
      expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    });

    it('puts the token in the URL fragment, not in the query a server or proxy sees', async () => {
      const handler = createHandler();

      await request(handler);

      const url = new URL(mockEmail.sendProjectPasswordReset.mock.calls[0][0].resetUrl);
      expect(url.search).not.toContain('token');
      expect(tokenOf(url.toString())).toMatch(/^[0-9a-f]{64}$/);
    });

    it('stores only a digest of the token it mailed', async () => {
      const handler = createHandler();

      const token = await requestedToken(handler);

      expect(resetRepo.rows).toHaveLength(1);
      expect(resetRepo.rows[0]).toMatchObject({ projectId: PROJECT, userId: USER });
      expect(JSON.stringify(resetRepo.rows)).not.toContain(token);
    });

    describe('no enumeration: the caller sees the same thing for every address', () => {
      const cases: Array<{ label: string; email?: string; arrange?: () => void }> = [
        { label: 'an unknown address', email: 'nobody@example.com' },
        {
          label: 'an address with no Email method (an OAuth-only identity)',
          arrange: () =>
            mockMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
              id: 'method-github',
              userId: USER,
              provider: UserAuthenticationMethodProvider.Github,
              providerId: '123',
            }),
        },
        {
          label: 'a user who is not a member of the project',
          arrange: () => mockProjectUsers.getProjectUsers.mockResolvedValue([]),
        },
      ];

      it.each(cases)('resolves with nothing and sends nothing for $label', async (testCase) => {
        const handler = createHandler();
        testCase.arrange?.();

        await expect(request(handler, { email: testCase.email })).resolves.toBeUndefined();

        expect(mockEmail.sendProjectPasswordReset).not.toHaveBeenCalled();
        expect(resetRepo.rows).toHaveLength(0);
      });

      it('resolves identically for a member whose mail cannot be sent, and does not surface the failure', async () => {
        const handler = createHandler();
        mockEmail.sendProjectPasswordReset.mockRejectedValue(new Error('smtp down'));

        await expect(request(handler)).resolves.toBeUndefined();
      });

      it('resolves identically for a member who has used up the per-address limit', async () => {
        const handler = createHandler();
        for (let i = 0; i < MAX_REQUESTS; i += 1) await request(handler);
        expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(MAX_REQUESTS);

        await expect(request(handler)).resolves.toBeUndefined();

        expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(MAX_REQUESTS);
      });

      it('returns the same value (undefined) for a member and a non-member', async () => {
        const handler = createHandler();
        const member = await request(handler);
        mockProjectUsers.getProjectUsers.mockResolvedValue([]);
        const stranger = await request(handler);

        expect(member).toBe(stranger);
      });
    });

    it('normalises the address (trim, lower case) before looking it up', async () => {
      const handler = createHandler();

      await request(handler, { email: '  MEMBER@EXAMPLE.COM ' });

      expect(mockMethods.getUserAuthenticationMethodByProvider).toHaveBeenCalledWith(
        UserAuthenticationMethodProvider.Email,
        EMAIL
      );
      expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(1);
    });

    it('limits per address: the next window sends again', async () => {
      const handler = createHandler();
      for (let i = 0; i < MAX_REQUESTS + 1; i += 1) await request(handler);
      expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(MAX_REQUESTS);

      clock = new Date(clock.getTime() + WINDOW_MS + 1);
      await request(handler);

      expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(MAX_REQUESTS + 1);
    });

    describe('what it rejects before it looks at the address', () => {
      it('an unknown client', async () => {
        const handler = createHandler();
        mockProjectApps.getProjectAppByClientId.mockResolvedValue(null);

        expect((await failureOf(request(handler))).name).toBe('NotFoundError');
        expect(mockMethods.getUserAuthenticationMethodByProvider).not.toHaveBeenCalled();
      });

      it('a redirect URI off the allowlist', async () => {
        const handler = createHandler();

        const failure = await failureOf(
          handler.requestReset({
            clientId: validApp.clientId,
            redirectUri: 'https://evil.example/cb',
            email: EMAIL,
          })
        );

        expect(failure).toEqual({
          name: 'BadRequestError',
          message: 'redirect_uri is not allowed for this app',
        });
        expect(mockMethods.getUserAuthenticationMethodByProvider).not.toHaveBeenCalled();
      });

      it.each([[[]], [null], [['email', 'github']]])(
        'an app whose enabledProviders is %j (password is opt-in)',
        async (list) => {
          const handler = createHandler();
          mockProjectApps.getProjectAppByClientId.mockResolvedValue({
            ...validApp,
            enabledProviders: list,
          });

          expect((await failureOf(request(handler))).message).toContain('not enabled for this app');
          expect(mockMethods.getUserAuthenticationMethodByProvider).not.toHaveBeenCalled();
          expect(mockEmail.sendProjectPasswordReset).not.toHaveBeenCalled();
        }
      );
    });

    describe('carrying the sign-in through the link', () => {
      const seedState = (overrides: Record<string, unknown> = {}) =>
        cacheStore.set(`${PROJECT_OAUTH_STATE_KEY_PREFIX}state-1`, {
          projectAppId: validApp.id,
          redirectUri: REDIRECT_URI,
          clientState: 'client-state',
          provider: 'password',
          codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
          codeChallengeMethod: 'S256',
          requestedScopeSlugs: ['user:read', 'user:write'],
          locale: 'de',
          ...overrides,
        });

      it('adds the client state, scope and PKCE challenge of the state it came from', async () => {
        const handler = createHandler();
        seedState();

        await request(handler, { stateId: 'state-1' });

        const params = mockEmail.sendProjectPasswordReset.mock.calls[0][0];
        const url = new URL(params.resetUrl);
        expect(url.searchParams.get('client_state')).toBe('client-state');
        expect(url.searchParams.get('scope')).toBe('user:read user:write');
        expect(url.searchParams.get('code_challenge')).toBe(
          'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
        );
        expect(url.searchParams.get('code_challenge_method')).toBe('S256');
        expect(params.locale).toBe('de');
        expect(url.pathname.startsWith('/de/')).toBe(true);
      });

      it('ignores a state that belongs to another app or redirect URI, without failing', async () => {
        const handler = createHandler();
        seedState({ projectAppId: 'another-app' });

        await request(handler, { stateId: 'state-1' });

        const url = new URL(mockEmail.sendProjectPasswordReset.mock.calls[0][0].resetUrl);
        expect(url.searchParams.has('client_state')).toBe(false);
        expect(url.searchParams.has('code_challenge')).toBe(false);
      });

      it('does not need the state to be live', async () => {
        const handler = createHandler();

        await request(handler, { stateId: 'expired-state' });

        expect(mockEmail.sendProjectPasswordReset).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('completeReset', () => {
    async function seedProjectPassword(source: 'cdm-import' | 'register' = 'cdm-import') {
      await credentialService.setPassword({
        scope: { scope: 'project', projectId: PROJECT },
        userId: USER,
        password: OLD_PASSWORD,
        source,
      });
    }

    const verifyProject = (password: string, projectId = PROJECT, userId = USER) =>
      credentialService.verifyPassword({
        scope: { scope: 'project', projectId },
        userId,
        password,
      });

    it('sets the member\'s project password with source "reset"', async () => {
      const handler = createHandler();
      await seedProjectPassword();
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
      expect(await verifyProject(OLD_PASSWORD)).toBe(false);
      const record = await credentialService.getCredential(
        { scope: 'project', projectId: PROJECT },
        USER
      );
      expect(record?.source).toBe('reset');
      // The one source a later import may replace is `cdm-import` (ADR 0011 § 4): a reset
      // is never it, so `passwordsSkippedExisting` applies to this credential from now on.
      expect(record?.source).not.toBe('cdm-import');
    });

    it('creates the project credential for a member who had none', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
    });

    it('leaves the platform credential, and every other project credential, untouched', async () => {
      const handler = createHandler();
      await credentialService.setPassword({
        scope: { scope: 'platform' },
        userId: USER,
        password: OLD_PASSWORD,
        source: 'register',
      });
      await credentialService.setPassword({
        scope: { scope: 'project', projectId: OTHER_PROJECT },
        userId: USER,
        password: OLD_PASSWORD,
        source: 'cdm-import',
      });
      const platformBefore = structuredClone(platformCredentials.rows);
      const otherProjectBefore = structuredClone(
        projectCredentials.rows.filter((row) => row.projectId === OTHER_PROJECT)
      );
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(platformCredentials.rows).toEqual(platformBefore);
      expect(projectCredentials.rows.filter((row) => row.projectId === OTHER_PROJECT)).toEqual(
        otherProjectBefore
      );
      expect(
        await credentialService.verifyPassword({
          scope: { scope: 'platform' },
          userId: USER,
          password: OLD_PASSWORD,
        })
      ).toBe(true);
      expect(await verifyProject(OLD_PASSWORD, OTHER_PROJECT)).toBe(true);
    });

    it('clears the lockout of that (project, user), and only that one', async () => {
      const handler = createHandler();
      const here = { scope: 'project', projectId: PROJECT } as const;
      const elsewhere = { scope: 'project', projectId: OTHER_PROJECT } as const;
      for (let i = 0; i < 3; i += 1) {
        await lockoutService.recordFailure(here, USER);
        await lockoutService.recordFailure(elsewhere, USER);
      }
      expect((await lockoutService.getStatus(here, USER)).locked).toBe(true);
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect((await lockoutService.getStatus(here, USER)).locked).toBe(false);
      expect((await lockoutService.getStatus(here, USER)).failedAttempts).toBe(0);
      expect((await lockoutService.getStatus(elsewhere, USER)).locked).toBe(true);
    });

    it("revokes the user's grants in this project, inside the same transaction", async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(mockGrants.revokeAllForUserInProject).toHaveBeenCalledTimes(1);
      expect(mockGrants.revokeAllForUserInProject).toHaveBeenCalledWith(PROJECT, USER, TX);
    });

    it('marks the global Email method verified, as the magic link does', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(mockMethods.updateUserAuthenticationMethod).toHaveBeenCalledTimes(1);
      expect(mockMethods.updateUserAuthenticationMethod).toHaveBeenCalledWith(
        METHOD,
        { isVerified: true },
        TX
      );
    });

    it('does not rewrite an Email method that is already verified', async () => {
      const handler = createHandler();
      mockMethods.getUserAuthenticationMethod.mockResolvedValue({
        id: METHOD,
        userId: USER,
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: true,
      });
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(mockMethods.updateUserAuthenticationMethod).not.toHaveBeenCalled();
    });

    it('does not verify a method that does not belong to the member the token names', async () => {
      const handler = createHandler();
      mockMethods.getUserAuthenticationMethod.mockResolvedValue({
        id: METHOD,
        userId: OTHER_USER,
        provider: UserAuthenticationMethodProvider.Email,
        isVerified: false,
      });
      const token = await requestedToken(handler);

      await complete(handler, token);

      expect(mockMethods.updateUserAuthenticationMethod).not.toHaveBeenCalled();
    });

    it('treats an Email method deleted since the request as a dead link, writing nothing', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      mockMethods.getUserAuthenticationMethod.mockRejectedValue(
        new NotFoundError('UserAuthenticationMethod')
      );

      expect(await failureOf(complete(handler, token))).toEqual(INVALID_LINK);

      expect(projectCredentials.rows).toHaveLength(0);
      expect(mockGrants.revokeAllForUserInProject).not.toHaveBeenCalled();
    });

    it('is single-use: the second attempt with the same token fails and changes nothing', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      await complete(handler, token);
      mockGrants.revokeAllForUserInProject.mockClear();

      expect(await failureOf(complete(handler, token, 'An0ther-Passw0rd!'))).toEqual(INVALID_LINK);

      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
      expect(await verifyProject('An0ther-Passw0rd!')).toBe(false);
      expect(mockGrants.revokeAllForUserInProject).not.toHaveBeenCalled();
    });

    it('refuses an expired token with the same generic error', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      clock = new Date(clock.getTime() + TTL_MS + 1);

      expect(await failureOf(complete(handler, token))).toEqual(INVALID_LINK);

      expect(projectCredentials.rows).toHaveLength(0);
    });

    it.each([
      ['unknown', 'f'.repeat(64)],
      ['empty', ''],
      ['not hex', 'not a token'],
    ])('refuses an %s token with the same generic error', async (_label, token) => {
      const handler = createHandler();
      await requestedToken(handler);

      expect(await failureOf(complete(handler, token))).toEqual(INVALID_LINK);
    });

    it('refuses a token issued for another project (a different app cannot use it)', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        projectId: OTHER_PROJECT,
      });

      expect(await failureOf(complete(handler, token))).toEqual(INVALID_LINK);
      expect(projectCredentials.rows).toHaveLength(0);

      // Nor did the foreign attempt burn it.
      mockProjectApps.getProjectAppByClientId.mockResolvedValue(validApp);
      await complete(handler, token);
      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
    });

    it('refuses when the member was removed after the link was requested, and writes nothing', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      mockProjectUsers.getProjectUsers.mockResolvedValue([]);

      expect(await failureOf(complete(handler, token))).toEqual(INVALID_LINK);

      expect(projectCredentials.rows).toHaveLength(0);
      expect(mockGrants.revokeAllForUserInProject).not.toHaveBeenCalled();
      expect(mockMethods.updateUserAuthenticationMethod).not.toHaveBeenCalled();
    });

    describe('the password policy', () => {
      it.each(['short', 'alllowercase1!', 'NoDigitsHere!!', 'Passw0rd!!!!'])(
        'rejects "%s" without echoing it, and does not use the token up',
        async (password) => {
          const handler = createHandler();
          const token = await requestedToken(handler);

          const failure = await failureOf(complete(handler, token, password));

          expect(failure.name).toBe('ValidationError');
          expect(failure.message).not.toContain(password);
          expect(projectCredentials.rows).toHaveLength(0);
          expect(mockGrants.revokeAllForUserInProject).not.toHaveBeenCalled();
          // The same link still works with an acceptable password.
          await complete(handler, token);
          expect(await verifyProject(NEW_PASSWORD)).toBe(true);
        }
      );

      it('checks the policy first: a weak password is a validation error whatever the token is', async () => {
        const handler = createHandler();

        const failure = await failureOf(complete(handler, 'f'.repeat(64), 'weak'));

        expect(failure.name).toBe('ValidationError');
        expect(failure.message).not.toContain('weak');
      });
    });

    it('rolls everything back, token included, when a step fails', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      mockGrants.revokeAllForUserInProject.mockRejectedValueOnce(new Error('db down'));

      await expect(complete(handler, token)).rejects.toThrow('db down');

      // The transaction rolled back, so the link is still good.
      mockGrants.revokeAllForUserInProject.mockResolvedValue(0);
      await complete(handler, token);
      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
    });

    it('never puts the password or the token into an error message', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      await complete(handler, token);

      const failure = await failureOf(complete(handler, token, 'Sup3r-Secret-Pw!'));

      expect(JSON.stringify(failure)).not.toContain('Sup3r-Secret-Pw!');
      expect(JSON.stringify(failure)).not.toContain(token);
    });

    it('is refused for an app that does not enable the password provider, before the token is touched', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);
      mockProjectApps.getProjectAppByClientId.mockResolvedValue({
        ...validApp,
        enabledProviders: ['email'],
      });

      expect((await failureOf(complete(handler, token))).message).toContain('not enabled');

      mockProjectApps.getProjectAppByClientId.mockResolvedValue(validApp);
      await complete(handler, token);
      expect(await verifyProject(NEW_PASSWORD)).toBe(true);
    });

    it('does not sign anyone in or create a platform session: it returns nothing', async () => {
      const handler = createHandler();
      const token = await requestedToken(handler);

      await expect(complete(handler, token)).resolves.toBeUndefined();
    });
  });
});
