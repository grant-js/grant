import type { Grant } from '@grantjs/core';
import type { UserSession } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserSessionService } from '@/services/user-sessions.service';

const mockConfig = vi.hoisted(() => ({
  app: { url: 'http://localhost:3000' },
  jwt: { accessTokenExpirationMinutes: 15, refreshTokenExpirationDays: 30 },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const signSessionToken = vi.fn().mockResolvedValue('signed-access-token');

const mockGrant = {
  signSessionToken,
} as unknown as Grant;

const mockAudit = {
  logUpdate: vi.fn(),
};

const mockRepo = {
  getSessionByRefreshToken: vi.fn(),
  refreshUserSession: vi.fn(),
  updateUserSession: vi.fn(),
  createUserSession: vi.fn(),
  getUserSessions: vi.fn(),
  softDeleteUserSession: vi.fn(),
  hardDeleteUserSession: vi.fn(),
};

const mockAuthMethods = {
  getUserAuthenticationMethod: vi.fn(),
};

function sessionFixture(
  overrides: Partial<UserSession> & { mfaVerifiedAt?: Date | null } = {}
): UserSession {
  const now = new Date();
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    userAuthenticationMethodId: '550e8400-e29b-41d4-a716-446655440002',
    token: 'refresh-token-value',
    audience: 'http://localhost:3000',
    expiresAt: new Date(now.getTime() + 86_400_000),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  } as UserSession;
}

function createService(): UserSessionService {
  return new UserSessionService(
    mockRepo as never,
    mockAuthMethods as never,
    mockAudit as never,
    mockGrant,
    { publish: vi.fn() } as never
  );
}

describe('UserSessionService refreshSessionByRefreshToken (isVerified)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps isVerified false when the session authentication method is unverified', async () => {
    const before = sessionFixture({ token: 'old-rt', mfaVerifiedAt: null });
    const after = sessionFixture({ token: 'new-rt', mfaVerifiedAt: null });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);
    mockAuthMethods.getUserAuthenticationMethod.mockResolvedValue({ isVerified: false });

    await createService().refreshSessionByRefreshToken('old-rt');

    expect(mockAuthMethods.getUserAuthenticationMethod).toHaveBeenCalledWith(
      before.userAuthenticationMethodId,
      undefined
    );
    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: false,
        mfaVerified: false,
      })
    );
  });

  it('keeps isVerified true when the session authentication method is verified', async () => {
    const before = sessionFixture({ token: 'old-rt', mfaVerifiedAt: null });
    const after = sessionFixture({ token: 'new-rt', mfaVerifiedAt: null });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);
    mockAuthMethods.getUserAuthenticationMethod.mockResolvedValue({ isVerified: true });

    await createService().refreshSessionByRefreshToken('old-rt');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: true,
        mfaVerified: false,
      })
    );
  });

  it('fails closed to isVerified false when the authentication method is missing', async () => {
    const before = sessionFixture({ token: 'old-rt' });
    const after = sessionFixture({ token: 'new-rt' });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);
    mockAuthMethods.getUserAuthenticationMethod.mockResolvedValue(undefined);

    await createService().refreshSessionByRefreshToken('old-rt');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: false,
      })
    );
  });

  it('still derives mfaVerified from user_sessions.mfaVerifiedAt', async () => {
    const mfaAt = new Date('2025-06-01T10:00:00.000Z');
    const before = sessionFixture({ token: 'old-rt', mfaVerifiedAt: mfaAt });
    const after = sessionFixture({ token: 'new-rt', mfaVerifiedAt: mfaAt });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);
    mockAuthMethods.getUserAuthenticationMethod.mockResolvedValue({ isVerified: false });

    await createService().refreshSessionByRefreshToken('old-rt');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: false,
        mfaVerified: true,
        acr: 'aal2',
        amr: ['pwd', 'otp'],
        mfa_auth_time: Math.floor(mfaAt.getTime() / 1000),
      })
    );
  });
});

describe('UserSessionService signSession (isVerified default)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never defaults the isVerified claim to true', async () => {
    const session = sessionFixture();
    await createService().signSession(session);

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        isVerified: false,
      })
    );
  });
});
