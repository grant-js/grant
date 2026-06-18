import {
  AccountType,
  EmailVerificationProofType,
  OrganizationInvitationStatus,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';
import { hashSecret } from '@/lib/token.lib';

const PASSWORD = 'Xe9#mK2!vQ7z';
const EMAIL = 'invitee@example.com';
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
};
const mockUsers = { createUser: vi.fn(), getUsers: vi.fn(), deleteOwnUser: vi.fn() };
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

function validProof() {
  return {
    type: EmailVerificationProofType.OrganizationInvitation,
    token: INVITATION_TOKEN,
    emailProofToken: EMAIL_PROOF_TOKEN,
  };
}

function pendingInvitation(email = EMAIL) {
  return {
    id: 'invitation-1',
    email,
    status: OrganizationInvitationStatus.Pending,
    expiresAt: new Date(Date.now() + 60_000),
    emailVerificationProofTokenHash: hashSecret(EMAIL_PROOF_TOKEN),
  };
}

describe('AuthHandler invitation email verification proof', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation((fn: (transaction: unknown) => Promise<unknown>) =>
      fn(tx)
    );
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue(pendingInvitation());
    mockAccountRoles.seedAccountRoles.mockResolvedValue([]);
    mockUserRoles.addUserRole.mockResolvedValue({});
    mockUsers.createUser.mockResolvedValue({ id: 'user-1', name: 'Invitee' });
    mockAccounts.createAccount.mockResolvedValue({ id: 'account-1', type: AccountType.Personal });
    mockUserSessions.createSession.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('registers an invited email as verified without sending an OTP', async () => {
    const otp = { token: 'otp-token', validUntil: Date.now() + 60_000 };
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { hashedPassword: 'hashed-password', otp },
      isVerified: false,
      name: 'Invitee',
    });
    mockUserAuthenticationMethods.createUserAuthenticationMethod.mockResolvedValue({
      id: 'auth-method-1',
      createdAt: new Date(),
    });

    const result = await createHandler().register({
      type: AccountType.Personal,
      provider: UserAuthenticationMethodProvider.Email,
      providerId: EMAIL,
      providerData: { password: PASSWORD },
      emailVerificationProof: validProof(),
    });

    expect(result.requiresEmailVerification).toBe(false);
    expect(result.verificationExpiry).toBeNull();
    expect(mockEmail.sendOtp).not.toHaveBeenCalled();
    expect(mockUserAuthenticationMethods.createUserAuthenticationMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: true,
        providerData: { hashedPassword: 'hashed-password' },
      }),
      tx
    );
    expect(mockUserSessions.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ isVerified: true }),
      tx,
      undefined
    );
  });

  it('rejects invitation proof when the token email does not match registration email', async () => {
    mockOrganizationInvitations.getInvitationByToken.mockResolvedValue(
      pendingInvitation('other@example.com')
    );
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);

    await expect(
      createHandler().register({
        type: AccountType.Personal,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
        emailVerificationProof: validProof(),
      })
    ).rejects.toThrow('Invitation proof does not match email address');

    expect(mockUsers.createUser).not.toHaveBeenCalled();
  });

  it('rejects token-only invitation proof from copied links', async () => {
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(null);

    await expect(
      createHandler().register({
        type: AccountType.Personal,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
        emailVerificationProof: {
          type: EmailVerificationProofType.OrganizationInvitation,
          token: INVITATION_TOKEN,
        } as never,
      })
    ).rejects.toThrow('Invalid or expired invitation proof');

    expect(mockUsers.createUser).not.toHaveBeenCalled();
  });

  it('marks an existing unverified invited email as verified during login', async () => {
    const authMethod = {
      id: 'auth-method-1',
      userId: 'user-1',
      providerData: {
        hashedPassword: hashSecret(PASSWORD),
        otp: { token: 'otp-token', validUntil: Date.now() + 60_000 },
      },
      isVerified: false,
      createdAt: new Date(),
    };
    const updatedAuthMethod = {
      ...authMethod,
      providerData: { hashedPassword: authMethod.providerData.hashedPassword },
      isVerified: true,
    };

    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { password: PASSWORD },
      isVerified: false,
      name: 'Invitee',
    });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue(
      authMethod
    );
    mockUserAuthenticationMethods.updateUserAuthenticationMethod.mockResolvedValue(
      updatedAuthMethod
    );
    mockUsers.getUsers.mockResolvedValue({
      totalCount: 1,
      users: [{ id: 'user-1', accounts: [{ id: 'account-1', type: AccountType.Personal }] }],
    });
    mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });

    const result = await createHandler().login({
      input: {
        provider: UserAuthenticationMethodProvider.Email,
        providerId: EMAIL,
        providerData: { password: PASSWORD },
        emailVerificationProof: validProof(),
      },
    });

    expect(result.requiresEmailVerification).toBe(false);
    expect(result.verificationExpiry).toBeNull();
    expect(mockUserAuthenticationMethods.updateUserAuthenticationMethod).toHaveBeenCalledWith(
      'auth-method-1',
      {
        isVerified: true,
        providerData: { hashedPassword: authMethod.providerData.hashedPassword },
      },
      tx
    );
    expect(mockUserSessions.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ isVerified: true }),
      tx,
      undefined
    );
  });
});
