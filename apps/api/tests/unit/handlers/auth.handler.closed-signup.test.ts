import {
  AccountType,
  EmailVerificationProofType,
  OrganizationInvitationStatus,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';
import { PUBLIC_SIGNUP_DISABLED_REASON } from '@/lib/signup-policy.lib';
import { hashSecret } from '@/lib/token.lib';

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

const PASSWORD = 'Xe9#mK2!vQ7z';
const EMAIL = 'first@example.com';
const INVITATION_TOKEN = 'invitation-token';
const EMAIL_PROOF_TOKEN = 'email-proof-token';
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
const mockOrganizationInvitations = { getInvitationByToken: vi.fn() };
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
    mockCache as never,
    mockScopeServices as never,
    mockDb as never
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

describe('AuthHandler closed-install signup policy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthCfg.publicSignupEnabled = true;
    mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
      fn(tx)
    );
  });

  it('allows platform register when public signup is enabled', async () => {
    stubSuccessfulRegister();

    await createHandler().register({
      type: AccountType.Personal,
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password: PASSWORD },
    });

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(mockUsers.createUser).toHaveBeenCalled();
  });

  it('allows the first human when public signup is off', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(0);
    stubSuccessfulRegister();

    await createHandler().register({
      type: AccountType.Personal,
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password: PASSWORD },
    });

    expect(mockUsers.countHumanUsers).toHaveBeenCalledWith(tx);
    expect(mockUsers.createUser).toHaveBeenCalled();
  });

  it('blocks a second platform self-signup when public signup is off', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(1);
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);

    try {
      await createHandler().register({
        type: AccountType.Personal,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).reason).toBe(PUBLIC_SIGNUP_DISABLED_REASON);
    }

    expect(mockUsers.createUser).not.toHaveBeenCalled();
    expect(mockUserAuthenticationMethods.processProvider).not.toHaveBeenCalled();
  });

  it('allows invitation-proof register when public signup is off', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(2);
    stubSuccessfulRegister();
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue({
      id: 'invitation-1',
      email: EMAIL,
      status: OrganizationInvitationStatus.Pending,
      expiresAt: new Date(Date.now() + 60_000),
      emailVerificationProofTokenHash: hashSecret(EMAIL_PROOF_TOKEN),
    });

    await createHandler().register({
      type: AccountType.Personal,
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password: PASSWORD },
      emailVerificationProof: {
        type: EmailVerificationProofType.OrganizationInvitation,
        token: INVITATION_TOKEN,
        emailProofToken: EMAIL_PROOF_TOKEN,
      },
    });

    expect(mockUsers.countHumanUsers).not.toHaveBeenCalled();
    expect(mockUsers.createUser).toHaveBeenCalled();
  });

  it('reports bootstrapOpen from human user count', async () => {
    mockAuthCfg.publicSignupEnabled = false;
    mockUsers.countHumanUsers.mockResolvedValue(0);

    await expect(createHandler().getSignupPolicy()).resolves.toEqual({
      publicSignupEnabled: false,
      bootstrapOpen: true,
    });

    mockUsers.countHumanUsers.mockResolvedValue(1);
    await expect(createHandler().getSignupPolicy()).resolves.toEqual({
      publicSignupEnabled: false,
      bootstrapOpen: false,
    });
  });
});
