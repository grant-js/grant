import type { Grant } from '@grantjs/core';
import type { UserSession } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserSessionService } from '@/services/user-sessions.service';

const mockConfig = vi.hoisted(() => ({
  app: { url: 'http://localhost:3000', isDevelopment: false },
  jwt: { accessTokenExpirationMinutes: 15, refreshTokenExpirationDays: 30 },
  logging: { level: 'silent', prettyPrint: false },
}));

vi.mock('@/config', () => ({ config: mockConfig }));

const signSessionToken = vi.fn().mockResolvedValue('signed-access-token');

const mockGrant = {
  signSessionToken,
} as unknown as Grant;

const mockAudit = {
  logUpdate: vi.fn(),
  logSoftDelete: vi.fn(),
};

const mockRepo = {
  getSessionByRefreshToken: vi.fn(),
  refreshUserSession: vi.fn(),
  findFamilyIdByPreviousRefreshToken: vi.fn(),
  getSessionFamilyId: vi.fn(),
  listActiveSessionsInFamily: vi.fn(),
  updateUserSession: vi.fn(),
  createUserSession: vi.fn(),
  getUserSessions: vi.fn(),
  softDeleteUserSession: vi.fn(),
  hardDeleteUserSession: vi.fn(),
};

const mockAuthMethods = {
  getUserAuthenticationMethod: vi.fn(),
};

const events = {
  publish: vi.fn(),
};

function sessionFixture(overrides: Partial<UserSession> = {}): UserSession {
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
    events as never
  );
}

describe('UserSessionService refreshSessionByRefreshToken (reuse revoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthMethods.getUserAuthenticationMethod.mockResolvedValue({ isVerified: true });
    mockRepo.findFamilyIdByPreviousRefreshToken.mockResolvedValue(null);
    mockRepo.getSessionFamilyId.mockResolvedValue(null);
    mockRepo.listActiveSessionsInFamily.mockResolvedValue([]);
    mockRepo.softDeleteUserSession.mockImplementation(async ({ id }: { id: string }) =>
      sessionFixture({ id })
    );
  });

  it('rotates an honest refresh token and does not revoke the family', async () => {
    const before = sessionFixture({ token: 'old-rt' });
    const after = sessionFixture({ token: 'new-rt' });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(after);

    const result = await createService().refreshSessionByRefreshToken('old-rt');

    expect(result?.refreshToken).toBe('new-rt');
    expect(mockRepo.refreshUserSession).toHaveBeenCalledWith(
      before.id,
      'old-rt',
      expect.any(String),
      expect.any(Date),
      expect.any(Date),
      before.userAgent ?? null,
      before.ipAddress ?? null,
      undefined
    );
    expect(mockRepo.softDeleteUserSession).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('revokes every live session in the family when a rotated secret is reused', async () => {
    const live = sessionFixture({ id: 'sess-live', token: 'current-rt' });
    const sibling = sessionFixture({ id: 'sess-sibling', token: 'sibling-rt' });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(undefined);
    mockRepo.findFamilyIdByPreviousRefreshToken.mockResolvedValue('family-1');
    mockRepo.listActiveSessionsInFamily.mockResolvedValue([live, sibling]);

    await expect(createService().refreshSessionByRefreshToken('old-rt')).resolves.toBeNull();

    expect(mockRepo.refreshUserSession).not.toHaveBeenCalled();
    expect(mockRepo.listActiveSessionsInFamily).toHaveBeenCalledWith('family-1', undefined);
    expect(mockRepo.softDeleteUserSession).toHaveBeenCalledTimes(2);
    expect(mockRepo.softDeleteUserSession).toHaveBeenCalledWith({ id: 'sess-live' }, undefined);
    expect(mockRepo.softDeleteUserSession).toHaveBeenCalledWith({ id: 'sess-sibling' }, undefined);
    expect(events.publish).toHaveBeenCalledTimes(2);
  });

  it('revokes the family when concurrent rotation loses the CAS', async () => {
    const before = sessionFixture({ token: 'old-rt' });
    mockRepo.getSessionByRefreshToken.mockResolvedValue(before);
    mockRepo.refreshUserSession.mockResolvedValue(null);
    mockRepo.getSessionFamilyId.mockResolvedValue('family-1');
    mockRepo.listActiveSessionsInFamily.mockResolvedValue([before]);

    await expect(createService().refreshSessionByRefreshToken('old-rt')).resolves.toBeNull();

    expect(mockRepo.getSessionFamilyId).toHaveBeenCalledWith(before.id, undefined);
    expect(mockRepo.softDeleteUserSession).toHaveBeenCalledWith({ id: before.id }, undefined);
  });
});
