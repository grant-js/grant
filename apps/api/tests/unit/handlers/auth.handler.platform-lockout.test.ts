/**
 * Platform (console) email/password lockout (ADR 0011 § 5 / audit M2).
 *
 * Record-before-verify, out of the request transaction, keyed by the resolved user
 * id — never the typed address. Social OAuth is not counted.
 */
import type { CredentialLockoutStatus } from '@grantjs/core';
import { AccountType, UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAuthCfg, mockVerifyCredentialPassword } = vi.hoisted(() => ({
  mockAuthCfg: {
    publicSignupEnabled: true,
    minAalAtLogin: 'aal1' as 'aal1' | 'aal2',
    maxFailedLoginAttempts: 5,
    lockoutDurationMinutes: 15,
  },
  mockVerifyCredentialPassword: vi.fn(() => false),
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

vi.mock('@/lib/credential-verifier.lib', () => ({
  verifyCredentialPassword: mockVerifyCredentialPassword,
}));

const { AuthHandler } = await import('@/handlers/auth.handler');

const PASSWORD = 'Xe9#mK2!vQ7z';
const EMAIL = 'person@example.com';
const USER_ID = 'user-1';
const tx = {};
const PLATFORM = { scope: 'platform' } as const;
const unlocked: CredentialLockoutStatus = {
  failedAttempts: 1,
  lockedUntil: null,
  locked: false,
};

const mockWithTransaction = vi.fn((fn: (transaction: unknown) => Promise<unknown>) => fn(tx));

const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  processProvider: vi.fn(),
  updateUserAuthenticationMethod: vi.fn(),
  ensureVerifiedContactEmail: vi.fn(),
};
const mockUsers = { getUsers: vi.fn(), countHumanUsers: vi.fn() };
const mockAccounts = { createAccount: vi.fn() };
const mockAccountRoles = { seedAccountRoles: vi.fn() };
const mockUserRoles = { addUserRole: vi.fn() };
const mockUserMfa = { hasActiveMfaEnrollment: vi.fn() };
const mockUserSessions = {
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  refreshSessionLastUsed: vi.fn(),
  signSession: vi.fn(),
};
const mockEmail = { sendOtp: vi.fn(), sendPasswordReset: vi.fn() };
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
const mockOrganizationUsers = { getUserOrganizationMemberships: vi.fn() };
const mockCredentials = { verifyPassword: vi.fn() };
const mockCredentialLockouts = {
  recordFailure: vi.fn(async () => unlocked),
  reset: vi.fn(async () => undefined),
  getStatus: vi.fn(),
  resetAllForUser: vi.fn(),
};
const mockCache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), clear: vi.fn() };

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
    { getAuth: vi.fn(), isPersonalScope: vi.fn() } as never,
    mockOrganizationInvitations as never,
    mockCredentials as never,
    mockCredentialLockouts as never,
    mockCache as never,
    {} as never,
    { withTransaction: mockWithTransaction } as never,
    {
      getUserOrganizationMemberships: mockOrganizationUsers.getUserOrganizationMemberships,
    } as never
  );
}

function stubEmailMethod() {
  mockUserAuthenticationMethods.processProvider.mockResolvedValue({
    providerData: { password: PASSWORD },
    isVerified: true,
    name: 'Ada',
  });
  mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
    id: 'auth-method-1',
    userId: USER_ID,
    isVerified: true,
    createdAt: new Date(),
    providerData: {},
  });
}

function stubSuccessfulSession() {
  mockUsers.getUsers.mockResolvedValue({
    totalCount: 1,
    users: [{ id: USER_ID, accounts: [{ id: 'account-1', type: AccountType.Personal }] }],
  });
  mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });
  mockUserSessions.createSession.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  });
}

function loginEmail(password = PASSWORD) {
  return createHandler().login({
    input: {
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthCfg.maxFailedLoginAttempts = 5;
  mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
    fn(tx)
  );
  mockCredentialLockouts.recordFailure.mockResolvedValue(unlocked);
  mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
});

describe('AuthHandler platform password lockout', () => {
  it('records a failure on the resolved user id before verify, without the request transaction', async () => {
    stubEmailMethod();
    const order: string[] = [];
    mockCredentialLockouts.recordFailure.mockImplementation(async () => {
      order.push('record');
      return unlocked;
    });
    mockCredentials.verifyPassword.mockImplementation(async () => {
      order.push('verify');
      return false;
    });

    await expect(loginEmail()).rejects.toThrow('Invalid credentials');

    expect(order).toEqual(['record', 'verify']);
    expect(mockCredentialLockouts.recordFailure).toHaveBeenCalledWith(PLATFORM, USER_ID);
    expect(mockCredentialLockouts.recordFailure.mock.calls[0]).toHaveLength(2);
    expect(mockCredentials.verifyPassword).toHaveBeenCalledWith(
      { scope: PLATFORM, userId: USER_ID, password: PASSWORD },
      tx
    );
    expect(mockCredentialLockouts.reset).not.toHaveBeenCalled();
  });

  it('clears the lockout on a successful password without the request transaction', async () => {
    stubEmailMethod();
    stubSuccessfulSession();
    mockCredentials.verifyPassword.mockResolvedValue(true);

    const result = await loginEmail();

    expect(result.accessToken).toBe('access-token');
    expect(mockCredentialLockouts.recordFailure).toHaveBeenCalledWith(PLATFORM, USER_ID);
    expect(mockCredentialLockouts.reset).toHaveBeenCalledWith(PLATFORM, USER_ID);
    expect(mockCredentialLockouts.reset.mock.calls[0]).toHaveLength(2);
  });

  it('refuses an attempt past the budget after a dummy compare, without verifying the stored hash', async () => {
    stubEmailMethod();
    mockCredentialLockouts.recordFailure.mockResolvedValue({
      failedAttempts: mockAuthCfg.maxFailedLoginAttempts + 1,
      lockedUntil: new Date(Date.now() + 60_000),
      locked: true,
    });

    await expect(loginEmail()).rejects.toThrow('Invalid credentials');

    expect(mockVerifyCredentialPassword).toHaveBeenCalledWith(PASSWORD, null);
    expect(mockCredentials.verifyPassword).not.toHaveBeenCalled();
    expect(mockCredentialLockouts.reset).not.toHaveBeenCalled();
    expect(mockUserSessions.createSession).not.toHaveBeenCalled();
  });

  it('still verifies the last attempt that sets the lock (count == max)', async () => {
    stubEmailMethod();
    mockCredentialLockouts.recordFailure.mockResolvedValue({
      failedAttempts: mockAuthCfg.maxFailedLoginAttempts,
      lockedUntil: new Date(Date.now() + 60_000),
      locked: true,
    });
    mockCredentials.verifyPassword.mockResolvedValue(false);

    await expect(loginEmail()).rejects.toThrow('Invalid credentials');

    expect(mockCredentials.verifyPassword).toHaveBeenCalledTimes(1);
    expect(mockVerifyCredentialPassword).not.toHaveBeenCalled();
  });

  it('does not key lockout by the typed address when the email is unknown', async () => {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { password: PASSWORD },
      isVerified: true,
      name: 'Ada',
    });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);

    await expect(loginEmail()).rejects.toThrow('User authentication method not found');

    expect(mockCredentialLockouts.recordFailure).not.toHaveBeenCalled();
    expect(mockCredentialLockouts.reset).not.toHaveBeenCalled();
    expect(mockCredentials.verifyPassword).not.toHaveBeenCalled();
  });

  it('does not count social OAuth login against the password lockout', async () => {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { login: 'ada' },
      isVerified: true,
      name: 'Ada',
    });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      id: 'auth-method-1',
      userId: USER_ID,
      isVerified: true,
      createdAt: new Date(),
      providerData: {},
    });
    stubSuccessfulSession();

    const result = await createHandler().login({
      input: {
        provider: UserAuthenticationMethodProvider.Github,
        providerId: 'gh-42',
        providerData: { login: 'ada' },
      },
    });

    expect(result.accessToken).toBe('access-token');
    expect(mockCredentialLockouts.recordFailure).not.toHaveBeenCalled();
    expect(mockCredentialLockouts.reset).not.toHaveBeenCalled();
    expect(mockCredentials.verifyPassword).not.toHaveBeenCalled();
  });
});
