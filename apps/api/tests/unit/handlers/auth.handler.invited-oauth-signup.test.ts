import { AccountType, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { PUBLIC_SIGNUP_DISABLED_REASON } from '@/lib/signup-policy.lib';

const { mockAuthCfg } = vi.hoisted(() => ({
  mockAuthCfg: { publicSignupEnabled: true, minAalAtLogin: 'aal1' as 'aal1' | 'aal2' },
}));

vi.mock('@/config', () => ({
  config: {
    auth: mockAuthCfg,
    app: { url: 'http://localhost:4000', isDevelopment: false },
    i18n: { defaultLocale: 'en' as const },
    logging: { level: 'silent', prettyPrint: false },
    token: { bcryptRounds: 4 },
  },
}));

const { AuthHandler } = await import('@/handlers/auth.handler');

const EMAIL = 'invited@example.com';
const tx = {};

const mockWithTransaction = vi.fn((fn: (transaction: unknown) => Promise<unknown>) => fn(tx));

const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  getUserAuthenticationMethodByEmail: vi.fn(),
  processProvider: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
  resendVerificationEmail: vi.fn(),
  getUserAuthenticationMethod: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
  ensureVerifiedContactEmail: vi.fn(),
};
const mockUsers = {
  createUser: vi.fn(),
  getUsers: vi.fn(),
  deleteOwnUser: vi.fn(),
  countHumanUsers: vi.fn(),
};
const mockAccounts = { createAccount: vi.fn(), getOwnerAccounts: vi.fn(), deleteAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn(), getUserRoles: vi.fn() };
const mockUserMfa = { setupTotp: vi.fn(), verifyTotp: vi.fn(), hasActiveMfaEnrollment: vi.fn() };
const mockUserSessions = {
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  refreshSessionLastUsed: vi.fn(),
  signSession: vi.fn(),
};
const mockEmail = { sendOtp: vi.fn(), sendPasswordReset: vi.fn(), sendInvitation: vi.fn() };
const mockAuth = { getAuth: vi.fn(), isPersonalScope: vi.fn() };
const mockOrganizationInvitations = {
  getInvitationByToken: vi.fn(),
  findPendingInvitationByEmail: vi.fn(),
};
const mockCredentials = { setPassword: vi.fn(), verifyPassword: vi.fn() };
const mockCache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() };
const mockScopeServices = {};
const mockDb = { withTransaction: mockWithTransaction };

function createHandler() {
  return new AuthHandler(
    mockUserAuthenticationMethods as never,
    mockUsers as never,
    mockAccounts as never,
    mockAccountRoles as never,
    mockUserRoles as never,
    mockUserMfa as never,
    mockUserSessions as never,
    mockEmail as never,
    mockAuth as never,
    mockOrganizationInvitations as never,
    mockCredentials as never,
    {
      recordFailure: vi.fn(async () => ({ failedAttempts: 1, lockedUntil: null, locked: false })),
      reset: vi.fn(async () => undefined),
    } as never,
    mockCache as never,
    mockScopeServices as never,
    mockDb as never,
    {} as never
  );
}

function stubSuccessfulRegister() {
  mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
  mockUserAuthenticationMethods.processProvider.mockResolvedValue({
    providerData: {
      hashedPassword: 'hashed-password',
      otp: { token: 'otp-token', validUntil: Date.now() + 60_000 },
    },
    isVerified: false,
    name: 'First',
  });
  mockUserAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({
    id: 'auth-method-1',
    createdAt: new Date(),
  });
  mockUsers.createUser.mockResolvedValue({ id: 'user-1', name: 'First' });
  mockAccounts.createAccount.mockResolvedValue({ id: 'account-1', type: AccountType.Personal });
  mockAccountRoles.seedAccountRoles.mockResolvedValue([]);
  mockUserRoles.addUserRole.mockResolvedValue({});
  mockUserSessions.createSession.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });
}

describe('AuthHandler invited OAuth sign-up on a closed install', () => {
  const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };

  function oauthInput(
    provider: UserAuthenticationMethodProvider,
    providerData: Record<string, unknown>
  ) {
    return {
      type: AccountType.Personal,
      provider,
      providerId: 'idp-42',
      providerData,
    };
  }

  const googleData = { email: EMAIL, emailVerified: true, name: 'Invited' };
  const githubData = { email: EMAIL, emailVerified: true, username: 'invited' };

  function register(
    provider: UserAuthenticationMethodProvider,
    providerData: Record<string, unknown>,
    trusted?: { authoritativeOAuthEmail?: string }
  ) {
    return createHandler().register(
      oauthInput(provider, providerData),
      'en',
      null,
      null,
      logger as never,
      undefined,
      trusted
    );
  }

  async function expectRefused(promise: Promise<unknown>) {
    try {
      await promise;
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).reason).toBe(PUBLIC_SIGNUP_DISABLED_REASON);
    }
    expect(mockUsers.createUser).not.toHaveBeenCalled();
    expect(mockUserAuthenticationMethods.processProvider).not.toHaveBeenCalled();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(3);
    mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
      fn(tx)
    );
    stubSuccessfulRegister();
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { email: EMAIL, emailVerified: true },
      isVerified: true,
      name: 'Invited',
    });
    mockOrganizationInvitations.findPendingInvitationByEmail.mockResolvedValue({
      id: 'invitation-1',
      organizationId: 'organization-1',
      email: EMAIL,
    });
  });

  it('allows Google sign-up when the trusted authoritative email has a pending invitation', async () => {
    await register(UserAuthenticationMethodProvider.Google, googleData, {
      authoritativeOAuthEmail: EMAIL,
    });

    expect(mockOrganizationInvitations.findPendingInvitationByEmail).toHaveBeenCalledWith(
      EMAIL,
      tx
    );
    expect(mockUsers.createUser).toHaveBeenCalled();
    expect(mockUserAuthenticationMethods.ensureVerifiedContactEmail).toHaveBeenCalledWith(
      'user-1',
      EMAIL,
      true,
      tx
    );
    const infoCall = logger.info.mock.calls.find(
      ([entry]) => entry.msg === 'Invited OAuth sign-up allowed'
    );
    expect(infoCall?.[0]).toEqual({
      msg: 'Invited OAuth sign-up allowed',
      provider: UserAuthenticationMethodProvider.Google,
      invitationId: 'invitation-1',
      organizationId: 'organization-1',
    });
  });

  it('allows GitHub sign-up when the trusted verified email has a pending invitation', async () => {
    await register(UserAuthenticationMethodProvider.Github, githubData, {
      authoritativeOAuthEmail: EMAIL,
    });

    expect(mockUsers.createUser).toHaveBeenCalled();
  });

  it('matches the invitation on the lower-cased address the provider reported', async () => {
    await register(
      UserAuthenticationMethodProvider.Google,
      { ...googleData, email: ' Invited@Example.COM ' },
      { authoritativeOAuthEmail: EMAIL }
    );

    expect(mockOrganizationInvitations.findPendingInvitationByEmail).toHaveBeenCalledWith(
      EMAIL,
      tx
    );
    expect(mockUsers.createUser).toHaveBeenCalled();
  });

  it('refuses when no pending, unexpired invitation exists (none, expired, revoked, accepted)', async () => {
    mockOrganizationInvitations.findPendingInvitationByEmail.mockResolvedValue(null);

    await expectRefused(
      register(UserAuthenticationMethodProvider.Google, googleData, {
        authoritativeOAuthEmail: EMAIL,
      })
    );
  });

  it('refuses when the provider email differs from the trusted email', async () => {
    await expectRefused(
      register(
        UserAuthenticationMethodProvider.Google,
        { ...googleData, email: 'someone-else@example.com' },
        { authoritativeOAuthEmail: EMAIL }
      )
    );
    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
  });

  it('refuses when the provider data does not mark the email verified', async () => {
    await expectRefused(
      register(
        UserAuthenticationMethodProvider.Github,
        { ...githubData, emailVerified: false },
        { authoritativeOAuthEmail: EMAIL }
      )
    );
    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
  });

  it('refuses without the trusted parameter, whatever providerData claims (REST-style call)', async () => {
    await expectRefused(
      register(UserAuthenticationMethodProvider.Google, {
        ...googleData,
        hd: 'example.com',
        emailAuthoritative: true,
        authoritativeOAuthEmail: EMAIL,
      })
    );
    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
  });

  it('refuses an empty trusted parameter', async () => {
    await expectRefused(register(UserAuthenticationMethodProvider.Google, googleData, {}));
    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
  });

  it('never applies to the email provider', async () => {
    await expectRefused(
      register(
        UserAuthenticationMethodProvider.Email,
        { ...googleData, password: 'Xe9#mK2!vQ7z' },
        { authoritativeOAuthEmail: EMAIL }
      )
    );
    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
  });

  it('does not look up invitations when public signup is enabled', async () => {
    mockAuthCfg.publicSignupEnabled = true;

    await register(UserAuthenticationMethodProvider.Google, googleData, {
      authoritativeOAuthEmail: EMAIL,
    });

    expect(mockOrganizationInvitations.findPendingInvitationByEmail).not.toHaveBeenCalled();
    expect(mockUsers.createUser).toHaveBeenCalled();
  });
});
