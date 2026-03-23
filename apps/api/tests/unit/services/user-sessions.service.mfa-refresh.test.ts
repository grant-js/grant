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

function sessionFixture(
  overrides: Partial<UserSession> & { mfaVerifiedAt?: Date | null }
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

describe('UserSessionService refreshSessionByRefreshToken (MFA / AAL)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes AAL2 JWT claims when the session row has mfaVerifiedAt after rotation', async () => {
    const mfaAt = new Date('2025-06-01T10:00:00.000Z');
    const before = sessionFixture({ mfaVerifiedAt: mfaAt, token: 'old-rt' });
    const after = sessionFixture({ mfaVerifiedAt: mfaAt, token: 'new-rt' });

    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);

    const service = new UserSessionService(mockRepo as never, mockAudit as never, mockGrant);

    await service.refreshSessionByRefreshToken('old-rt');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        mfaVerified: true,
        acr: 'aal2',
        amr: ['pwd', 'otp'],
        mfa_auth_time: Math.floor(mfaAt.getTime() / 1000),
      })
    );
  });

  it('passes AAL1 JWT claims when mfaVerifiedAt is absent after rotation', async () => {
    const before = sessionFixture({ mfaVerifiedAt: null, token: 'old-rt' });
    const after = sessionFixture({ mfaVerifiedAt: null, token: 'new-rt' });

    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);

    const service = new UserSessionService(mockRepo as never, mockAudit as never, mockGrant);

    await service.refreshSessionByRefreshToken('old-rt');

    expect(signSessionToken).toHaveBeenCalledWith(
      expect.objectContaining({
        mfaVerified: false,
        acr: 'aal1',
        amr: ['pwd'],
      })
    );
    const payload = signSessionToken.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.mfa_auth_time).toBeUndefined();
  });
});
