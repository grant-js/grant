import type {
  IAuditLogger,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const userId = '10000000-0000-4000-8000-0000000000a0';
const otherUserId = '10000000-0000-4000-8000-0000000000a2';
const methodId = '10000000-0000-4000-8000-0000000000a1';
const now = new Date('2026-01-01T00:00:00.000Z');

function emailMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: methodId,
    userId,
    provider: UserAuthenticationMethodProvider.Email,
    providerId: 'ada@example.com',
    providerData: {},
    isVerified: true,
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildService(repo: Partial<IUserAuthenticationMethodRepository>) {
  return new UserAuthenticationMethodService(
    {
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
      findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
      createUserAuthenticationMethod: vi.fn().mockResolvedValue(emailMethod()),
      ...repo,
    } as IUserAuthenticationMethodRepository,
    {} as IUserSessionRepository,
    { logCreate: vi.fn() } as unknown as IAuditLogger,
    { publish: vi.fn() } as IEventPublisher
  );
}

describe('UserAuthenticationMethodService.ensureVerifiedContactEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a passwordless verified Email method', async () => {
    const createUserAuthenticationMethod = vi.fn().mockResolvedValue(emailMethod());
    const service = buildService({ createUserAuthenticationMethod });

    const created = await service.ensureVerifiedContactEmail(userId, 'Ada@Example.com', true);

    expect(createUserAuthenticationMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: 'ada@example.com',
        providerData: {},
        isVerified: true,
        isPrimary: true,
      }),
      undefined
    );
    expect(created?.providerId).toBe('ada@example.com');
  });

  it('skips when the IdP email is unverified', async () => {
    const createUserAuthenticationMethod = vi.fn();
    const service = buildService({ createUserAuthenticationMethod });

    await expect(
      service.ensureVerifiedContactEmail(userId, 'ada@example.com', false)
    ).resolves.toBeNull();
    expect(createUserAuthenticationMethod).not.toHaveBeenCalled();
  });

  it('skips when the user already has Email', async () => {
    const createUserAuthenticationMethod = vi.fn();
    const service = buildService({
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([emailMethod({ isPrimary: true })]),
      createUserAuthenticationMethod,
    });

    await expect(
      service.ensureVerifiedContactEmail(userId, 'ada@example.com', true)
    ).resolves.toBeNull();
    expect(createUserAuthenticationMethod).not.toHaveBeenCalled();
  });

  it('skips when another user already owns that Email address', async () => {
    const createUserAuthenticationMethod = vi.fn();
    const service = buildService({
      findByProviderAndProviderId: vi
        .fn()
        .mockResolvedValue(emailMethod({ userId: otherUserId, isPrimary: true })),
      createUserAuthenticationMethod,
    });

    await expect(
      service.ensureVerifiedContactEmail(userId, 'ada@example.com', true)
    ).resolves.toBeNull();
    expect(createUserAuthenticationMethod).not.toHaveBeenCalled();
  });

  it('does not swallow unexpected errors', async () => {
    const service = buildService({
      createUserAuthenticationMethod: vi.fn().mockRejectedValue(new Error('db down')),
    });

    await expect(
      service.ensureVerifiedContactEmail(userId, 'ada@example.com', true)
    ).rejects.toThrow('db down');
  });
});
