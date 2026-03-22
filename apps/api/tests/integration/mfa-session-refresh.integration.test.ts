/**
 * Integration: UserSessionService delegates markMfaVerified to the repository with
 * mfaVerifiedAt so DB persistence stays aligned with refresh-time AAL derivation.
 */
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
} as never;

const mockAudit = {
  logUpdate: vi.fn(),
};

const updateUserSession = vi.fn();

const mockRepo = {
  updateUserSession,
  getSessionByRefreshToken: vi.fn(),
  refreshUserSession: vi.fn(),
  createUserSession: vi.fn(),
  getUserSessions: vi.fn(),
  softDeleteUserSession: vi.fn(),
  hardDeleteUserSession: vi.fn(),
};

describe('UserSessionService markMfaVerified (integration with repository)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUserSession.mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      mfaVerifiedAt: new Date(),
    });
  });

  it('calls repository.updateUserSession with mfaVerifiedAt for the session row', async () => {
    const service = new UserSessionService(mockRepo as never, mockAudit as never, mockGrant);
    await service.markMfaVerified('550e8400-e29b-41d4-a716-446655440000');

    expect(updateUserSession).toHaveBeenCalledTimes(1);
    expect(updateUserSession).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '550e8400-e29b-41d4-a716-446655440000',
        mfaVerifiedAt: expect.any(Date),
      }),
      undefined
    );
  });
});
