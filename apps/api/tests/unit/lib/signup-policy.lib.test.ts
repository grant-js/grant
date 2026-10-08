import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthorizationError } from '@/lib/errors';

const mockConfig = {
  auth: { publicSignupEnabled: true },
};

vi.mock('@/config', () => ({ config: mockConfig }));

const {
  assertNotLastHumanUser,
  assertPlatformSelfSignupAllowed,
  LAST_HUMAN_USER_REASON,
  PUBLIC_SIGNUP_DISABLED_REASON,
} = await import('@/lib/signup-policy.lib');

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';

describe('assertPlatformSelfSignupAllowed', () => {
  beforeEach(() => {
    mockConfig.auth.publicSignupEnabled = true;
  });

  it('allows register when public signup is enabled', () => {
    expect(() =>
      assertPlatformSelfSignupAllowed({ invitationProofValid: false, humanUserCount: 3 })
    ).not.toThrow();
  });

  it('allows the first human when public signup is off', () => {
    mockConfig.auth.publicSignupEnabled = false;
    expect(() =>
      assertPlatformSelfSignupAllowed({ invitationProofValid: false, humanUserCount: 0 })
    ).not.toThrow();
  });

  it('refuses a second self-signup when public signup is off', () => {
    mockConfig.auth.publicSignupEnabled = false;
    try {
      assertPlatformSelfSignupAllowed({ invitationProofValid: false, humanUserCount: 1 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).reason).toBe(PUBLIC_SIGNUP_DISABLED_REASON);
    }
  });

  it('allows invitation-proof register when public signup is off', () => {
    mockConfig.auth.publicSignupEnabled = false;
    expect(() =>
      assertPlatformSelfSignupAllowed({ invitationProofValid: true, humanUserCount: 4 })
    ).not.toThrow();
  });
});

describe('assertNotLastHumanUser', () => {
  it('allows deleting a human when another human remains', () => {
    expect(() =>
      assertNotLastHumanUser({
        userId: 'human-1',
        systemUserId: SYSTEM_USER_ID,
        humanUserCount: 2,
      })
    ).not.toThrow();
  });

  it('refuses deleting the last human user', () => {
    try {
      assertNotLastHumanUser({
        userId: 'human-1',
        systemUserId: SYSTEM_USER_ID,
        humanUserCount: 1,
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AuthorizationError);
      expect((err as AuthorizationError).reason).toBe(LAST_HUMAN_USER_REASON);
    }
  });

  it('does not treat the system user as the last human', () => {
    expect(() =>
      assertNotLastHumanUser({
        userId: SYSTEM_USER_ID,
        systemUserId: SYSTEM_USER_ID,
        humanUserCount: 1,
      })
    ).not.toThrow();
  });
});
