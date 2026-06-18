import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';
import { AuthenticationError } from '@/lib/errors';

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
};
const mockUserSessions = {
  createSession: vi.fn(),
  markMfaVerified: vi.fn(),
  getUserSession: vi.fn(),
  signSession: vi.fn(),
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

describe('AuthHandler verifyMfaRecoveryCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks session MFA verified and returns signed tokens when recovery code is valid', async () => {
    mockUserMfa.verifyRecoveryCode.mockResolvedValue(true);
    mockUserSessions.getUserSession.mockResolvedValue({ id: 'sess-1' });
    mockUserSessions.signSession.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const handler = createHandler();
    const result = await handler.verifyMfaRecoveryCode(
      'user-1',
      'sess-1',
      'ABCD-EFGH',
      'https://app.example'
    );

    expect(mockUserMfa.verifyRecoveryCode).toHaveBeenCalledWith(
      'user-1',
      'ABCD-EFGH',
      expect.anything()
    );
    expect(mockUserSessions.markMfaVerified).toHaveBeenCalledWith('sess-1', expect.anything());
    expect(mockUserSessions.signSession).toHaveBeenCalledWith(
      { id: 'sess-1' },
      true,
      true,
      'https://app.example'
    );
    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      mfaVerified: true,
    });
  });

  it('throws AuthenticationError when recovery code is invalid', async () => {
    mockUserMfa.verifyRecoveryCode.mockResolvedValue(false);

    const handler = createHandler();

    await expect(handler.verifyMfaRecoveryCode('user-1', 'sess-1', 'bad')).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(mockUserSessions.markMfaVerified).not.toHaveBeenCalled();
    expect(mockUserSessions.signSession).not.toHaveBeenCalled();
  });
});
