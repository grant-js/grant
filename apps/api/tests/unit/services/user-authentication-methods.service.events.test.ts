import type {
  IAuditLogger,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    verifySecret: vi.fn().mockReturnValue(true),
    hashSecret: vi.fn().mockReturnValue('hashed-new'),
  };
});

import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const userId = '10000000-0000-4000-8000-0000000000a0';
const methodId = '10000000-0000-4000-8000-0000000000a1';

function buildService(providerData: Record<string, unknown> = { hashedPassword: 'hashed-old' }) {
  const userAuthenticationMethodRepository = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([
      {
        id: methodId,
        userId,
        provider: UserAuthenticationMethodProvider.Email,
        providerData,
      },
    ]),
    updateUserAuthenticationMethod: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUserAuthenticationMethodRepository;

  const audit = {
    logUpdate: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new UserAuthenticationMethodService(
      userAuthenticationMethodRepository,
      {} as IUserSessionRepository,
      audit,
      events
    ),
    events,
    userAuthenticationMethodRepository,
  };
}

describe('UserAuthenticationMethodService security events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes user.password_changed after changePassword', async () => {
    const { service, events } = buildService();

    await service.changePassword(userId, 'CurrentPass1!', 'NewPass1!');

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user.password_changed',
        subjectUserId: userId,
        aggregate: { kind: 'userAuthenticationMethod', id: methodId },
        data: { after: { userId, reason: 'change' } },
      }),
      undefined
    );
  });

  it('sets a first password without the current password', async () => {
    const { service, events, userAuthenticationMethodRepository } = buildService({});

    await service.changePassword(userId, undefined, 'NewPass1!');

    expect(userAuthenticationMethodRepository.updateUserAuthenticationMethod).toHaveBeenCalledWith(
      methodId,
      { providerData: { hashedPassword: 'hashed-new' } },
      undefined
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { after: { userId, reason: 'set' } },
      }),
      undefined
    );
  });

  it('requires the current password when a hash already exists', async () => {
    const { service } = buildService();

    await expect(service.changePassword(userId, undefined, 'NewPass1!')).rejects.toThrow(
      'Current password is required'
    );
  });
});
