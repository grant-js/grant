/**
 * Unit test: AuthHandler methods that log use optional requestLogger when provided,
 * so handler-originated logs include requestId when called from routes/resolvers.
 */

import type { ILogger } from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';

const mockResendVerificationEmail = vi.fn();
const mockSendOtp = vi.fn();
const mockWithTransaction = vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({}));

const mockUserAuthenticationMethods = {
  resendVerificationEmail: mockResendVerificationEmail,
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
const mockUserMfa = { setupTotp: vi.fn(), verifyTotp: vi.fn() };
const mockUserSessions = { createSession: vi.fn() };
const mockEmail = { sendOtp: mockSendOtp, sendPasswordReset: vi.fn(), sendInvitation: vi.fn() };
const mockAuth = { getAuth: vi.fn() };
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

describe('AuthHandler optional requestLogger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResendVerificationEmail.mockResolvedValue({
      token: 'tok',
      validUntil: Date.now() + 60_000,
    });
    mockSendOtp.mockRejectedValue(new Error('Send failed'));
  });

  it('resendVerificationEmail: when requestLogger is passed, uses it for error log', async () => {
    const requestLogger = {
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(function (this: ILogger) {
        return this;
      }),
    } as unknown as ILogger;

    const handler = createHandler();

    await expect(
      handler.resendVerificationEmail('u@example.com', 'en', requestLogger)
    ).rejects.toThrow('Failed to send verification email');

    expect(requestLogger.error).toHaveBeenCalledTimes(1);
    expect(requestLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Error sending verification email',
        err: expect.any(Error),
      })
    );
  });

  it('resendVerificationEmail: when requestLogger is not passed, uses handler logger', async () => {
    const handler = createHandler();
    const loggerErrorSpy = vi.spyOn(handler['logger'], 'error');

    await expect(handler.resendVerificationEmail('u@example.com', 'en')).rejects.toThrow(
      'Failed to send verification email'
    );

    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Error sending verification email',
        err: expect.any(Error),
      })
    );
  });
});
