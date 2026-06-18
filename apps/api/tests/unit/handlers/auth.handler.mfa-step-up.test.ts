import { AccountType, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';
import { AuthenticationError } from '@/lib/errors';

const { mockAuthCfg } = vi.hoisted(() => ({
  mockAuthCfg: { minAalAtLogin: 'aal1' as 'aal1' | 'aal2' },
}));

vi.mock('@/config', () => ({
  config: {
    auth: mockAuthCfg,
    app: { url: 'http://localhost:4000', isDevelopment: false },
    i18n: { defaultLocale: 'en' as const },
    logging: { level: 'silent', prettyPrint: false },
  },
}));

const mockUserAuthenticationMethods = {
  resendVerificationEmail: vi.fn(),
  getUserAuthenticationMethodByProvider: vi.fn(),
  processProvider: vi.fn(),
  createUserAuthenticationMethod: vi.fn(),
  getUserAuthenticationMethod: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  invalidateAllUserSessions: vi.fn(),
};
const mockUsers = { createUser: vi.fn(), getUsers: vi.fn(), deleteOwnUser: vi.fn() };
const mockAccounts = { createAccount: vi.fn(), getOwnerAccounts: vi.fn(), deleteAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn(), getUserRoles: vi.fn() };
const mockUserMfa = {
  setupTotp: vi.fn(),
  verifyTotp: vi.fn(),
  verifyRecoveryCode: vi.fn(),
  hasActiveMfaEnrollment: vi.fn(),
};
const mockUserSessions = {
  createSession: vi.fn(),
  markMfaVerified: vi.fn(),
  getUserSession: vi.fn(),
  signSession: vi.fn(),
  getUserSessions: vi.fn(),
  refreshSessionLastUsed: vi.fn(),
  refreshSessionByRefreshToken: vi.fn(),
};
const mockEmail = { sendOtp: vi.fn(), sendPasswordReset: vi.fn(), sendInvitation: vi.fn() };
const mockAuth = { getAuth: vi.fn() };
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
const mockCache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() };
const mockScopeServices = {};
const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({}));
const mockDb = { withTransaction: mockWithTransaction };

function createHandler(): AuthHandler {
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
    mockCache as never,
    mockScopeServices as never,
    mockDb as never
  );
}

const loginInputGithub = {
  input: {
    provider: UserAuthenticationMethodProvider.Github,
    providerId: 'gh-1',
    providerData: {},
  },
};

function stubVerifiedUserWithAccounts() {
  mockUserAuthenticationMethods.processProvider.mockResolvedValue({
    providerData: {},
    isVerified: true,
    name: 'Test',
  });
  mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
    userId: 'user-1',
    isVerified: true,
    id: 'auth-method-1',
    providerData: {},
    createdAt: new Date(),
  });
  mockUsers.getUsers.mockResolvedValue({
    totalCount: 1,
    users: [
      {
        id: 'user-1',
        accounts: [{ id: 'acc-1', type: AccountType.Personal }],
      },
    ],
  });
}

describe('AuthHandler login requiresMfaStepUp (computeRequiresMfaStepUp via login)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCfg.minAalAtLogin = 'aal2';
    stubVerifiedUserWithAccounts();
    mockUserSessions.createSession.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
    mockUserSessions.signSession.mockResolvedValue({
      accessToken: 'reuse-access',
      refreshToken: 'reuse-refresh',
    });
  });

  it('requiresMfaStepUp false when minAalAtLogin is aal1', async () => {
    mockAuthCfg.minAalAtLogin = 'aal1';
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });

    const handler = createHandler();
    const result = await handler.login(loginInputGithub as never);

    expect(result.requiresMfaStepUp).toBe(false);
    expect(mockUserMfa.hasActiveMfaEnrollment).not.toHaveBeenCalled();
  });

  it('requiresMfaStepUp false when minAalAtLogin is aal2 but user has no MFA enrollment (new session)', async () => {
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
    mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });

    const handler = createHandler();
    const result = await handler.login(loginInputGithub as never);

    expect(result.requiresMfaStepUp).toBe(false);
    expect(mockUserMfa.hasActiveMfaEnrollment).toHaveBeenCalledWith('user-1', expect.anything());
  });

  it('requiresMfaStepUp true when minAalAtLogin is aal2, enrolled, new session (mfaVerified false)', async () => {
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });

    const handler = createHandler();
    const result = await handler.login(loginInputGithub as never);

    expect(result.requiresMfaStepUp).toBe(true);
    expect(result.mfaVerified).toBe(false);
  });

  it('requiresMfaStepUp false when reusing session that already has mfaVerifiedAt (mfaVerifiedSession true)', async () => {
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    mockUserSessions.getUserSessions.mockResolvedValue({
      userSessions: [
        {
          id: 'sess-existing',
          mfaVerifiedAt: new Date(),
        },
      ],
    });

    const handler = createHandler();
    const result = await handler.login(loginInputGithub as never);

    expect(result.requiresMfaStepUp).toBe(false);
    expect(mockUserSessions.refreshSessionLastUsed).toHaveBeenCalledWith(
      'sess-existing',
      expect.anything()
    );
    expect(mockUserSessions.signSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-existing' }),
      true,
      true,
      undefined
    );
  });

  it('requiresMfaStepUp true when reusing session without mfaVerifiedAt and user enrolled', async () => {
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(true);
    mockUserSessions.getUserSessions.mockResolvedValue({
      userSessions: [{ id: 'sess-aal1', mfaVerifiedAt: null }],
    });

    const handler = createHandler();
    const result = await handler.login(loginInputGithub as never);

    expect(result.requiresMfaStepUp).toBe(true);
    expect(mockUserSessions.signSession).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sess-aal1' }),
      true,
      false,
      undefined
    );
  });
});

describe('AuthHandler refreshSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when refresh token does not resolve a session', async () => {
    mockUserSessions.refreshSessionByRefreshToken.mockResolvedValue(null);
    const handler = createHandler();
    await expect(handler.refreshSession('bad-token')).rejects.toBeInstanceOf(AuthenticationError);
  });

  it('returns tokens from user session service (MFA state comes from session row inside service)', async () => {
    mockUserSessions.refreshSessionByRefreshToken.mockResolvedValue({
      accessToken: 'ref-a',
      refreshToken: 'ref-r',
    });
    const handler = createHandler();
    const result = await handler.refreshSession('good-token', 'ua', '127.0.0.1', 'http://api.test');
    expect(result).toEqual({ accessToken: 'ref-a', refreshToken: 'ref-r' });
    expect(mockUserSessions.refreshSessionByRefreshToken).toHaveBeenCalledWith(
      'good-token',
      expect.anything(),
      'ua',
      '127.0.0.1',
      undefined,
      undefined,
      'http://api.test'
    );
  });
});
