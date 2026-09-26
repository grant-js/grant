import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthHandler } from '@/handlers/auth.handler';
import { loginFailureReason } from '@/lib/analytics/login-failure';
import { AuthenticationError } from '@/lib/errors';
import { hashSecret } from '@/lib/token.lib';

const trackProductEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/analytics', async () => {
  const actual = await vi.importActual<typeof import('@/lib/analytics')>('@/lib/analytics');
  return {
    ...actual,
    trackProductEvent,
    trackProductEventAfterCommit: (_schedule: unknown, event: unknown) => trackProductEvent(event),
  };
});

const mockUserAuthenticationMethods = {
  getUserAuthenticationMethodByProvider: vi.fn(),
  processProvider: vi.fn(),
  ensureVerifiedContactEmail: vi.fn(),
};
const mockUsers = { getUsers: vi.fn() };
const mockAccounts = {};
const mockAccountRoles = {};
const mockUserRoles = {};
const mockUserMfa = {
  verifyTotp: vi.fn(),
  verifyRecoveryCode: vi.fn(),
  hasActiveMfaEnrollment: vi.fn().mockResolvedValue(false),
};
const mockUserSessions = {
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  refreshSessionLastUsed: vi.fn(),
  signSession: vi.fn(),
  markMfaVerified: vi.fn(),
  getUserSession: vi.fn(),
};
const mockEmail = {};
const mockAuth = {};
const mockOrganizationInvitations = {};
const mockCache = {};
const mockScopeServices = {};
const callOrder: string[] = [];
const mockDb = {
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
    callOrder.push('tx-start');
    try {
      return await fn({});
    } finally {
      callOrder.push('tx-commit');
    }
  }),
};

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

describe('loginFailureReason', () => {
  it('maps credential and verification failures and ignores other errors', () => {
    expect(
      loginFailureReason(new AuthenticationError('User authentication method not found'))
    ).toBe('credentials');
    expect(loginFailureReason(new AuthenticationError('Invalid credentials'))).toBe('credentials');
    expect(loginFailureReason(new AuthenticationError('User not verified'))).toBe('unverified');
    expect(loginFailureReason(new AuthenticationError('Invalid MFA code'))).toBeNull();
    expect(loginFailureReason(new Error('db down'))).toBeNull();
  });
});

describe('AuthHandler product analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
    trackProductEvent.mockImplementation(() => {
      callOrder.push('track');
    });
    mockUserMfa.hasActiveMfaEnrollment.mockResolvedValue(false);
  });

  it('emits session.started only after a new session commits', async () => {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({ providerData: {} });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      id: 'method-1',
      userId: 'user-1',
      isVerified: true,
      createdAt: new Date(),
      providerData: {},
    });
    mockUsers.getUsers.mockResolvedValue({
      totalCount: 1,
      users: [{ id: 'user-1', accounts: [{ id: 'account-1' }] }],
    });
    mockUserSessions.getUserSessions.mockResolvedValue({ userSessions: [] });
    mockUserSessions.createSession.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const handler = createHandler();
    await handler.login({
      input: {
        provider: UserAuthenticationMethodProvider.Github,
        providerId: 'gh-1',
        providerData: {},
      },
    });

    expect(callOrder).toEqual(['tx-start', 'tx-commit', 'track']);
    expect(trackProductEvent).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'session.started',
      properties: {
        provider: 'github',
        stepUpRequired: false,
        actorId: 'user-1',
      },
    });
  });

  it('does not emit session.started when login reuses a matching session', async () => {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({ providerData: {} });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      id: 'method-1',
      userId: 'user-1',
      isVerified: true,
      createdAt: new Date(),
      providerData: {},
    });
    mockUsers.getUsers.mockResolvedValue({
      totalCount: 1,
      users: [{ id: 'user-1', accounts: [{ id: 'account-1' }] }],
    });
    mockUserSessions.getUserSessions.mockResolvedValue({
      userSessions: [{ id: 'sess-1', mfaVerifiedAt: null }],
    });
    mockUserSessions.signSession.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    const handler = createHandler();
    await handler.login({
      input: {
        provider: UserAuthenticationMethodProvider.Github,
        providerId: 'gh-1',
        providerData: {},
      },
    });

    expect(mockUserSessions.createSession).not.toHaveBeenCalled();
    expect(trackProductEvent).not.toHaveBeenCalled();
  });

  it('emits session.failed for an unknown method and a bad password', async () => {
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { password: 'nope' },
    });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValueOnce(null);

    const handler = createHandler();
    await expect(
      handler.login({
        input: {
          provider: UserAuthenticationMethodProvider.Email,
          providerId: 'person@example.com',
          providerData: { password: 'nope' },
        },
      })
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'session.failed',
      properties: { provider: 'email', reason: 'credentials' },
    });
    expect(JSON.stringify(trackProductEvent.mock.calls)).not.toContain('person@example.com');

    trackProductEvent.mockClear();
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValueOnce({
      id: 'method-1',
      userId: 'user-1',
      isVerified: true,
      createdAt: new Date(),
      providerData: {},
    });

    await expect(
      handler.login({
        input: {
          provider: UserAuthenticationMethodProvider.Email,
          providerId: 'person@example.com',
          providerData: { password: 'nope' },
        },
      })
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'session.failed',
      properties: { provider: 'email', reason: 'credentials' },
    });
  });

  it('emits session.failed with reason unverified', async () => {
    const password = 'correct-horse';
    mockUserAuthenticationMethods.processProvider.mockResolvedValue({
      providerData: { password },
    });
    mockUserAuthenticationMethods.getUserAuthenticationMethodByProvider.mockResolvedValue({
      id: 'method-1',
      userId: 'user-1',
      isVerified: false,
      createdAt: new Date('2020-01-01T00:00:00.000Z'),
      providerData: { hashedPassword: hashSecret(password) },
    });

    const handler = createHandler();
    await expect(
      handler.login({
        input: {
          provider: UserAuthenticationMethodProvider.Email,
          providerId: 'person@example.com',
          providerData: { password },
        },
      })
    ).rejects.toBeInstanceOf(AuthenticationError);

    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'session.failed',
      properties: { provider: 'email', reason: 'unverified' },
    });
  });

  it('emits session.failed for MFA failures and not for a successful challenge', async () => {
    mockUserMfa.verifyTotp.mockResolvedValue({ verified: false });
    const handler = createHandler();

    await expect(handler.verifyMfa('user-1', 'sess-1', '000000')).rejects.toBeInstanceOf(
      AuthenticationError
    );
    expect(trackProductEvent).toHaveBeenCalledWith({
      name: 'session.failed',
      properties: { reason: 'mfa', actorId: 'user-1' },
    });

    trackProductEvent.mockClear();
    mockUserMfa.verifyTotp.mockResolvedValue({ verified: true });
    mockUserSessions.getUserSession.mockResolvedValue({ id: 'sess-1' });
    mockUserSessions.signSession.mockResolvedValue({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    await handler.verifyMfa('user-1', 'sess-1', '000000');
    expect(trackProductEvent).not.toHaveBeenCalled();
  });
});
