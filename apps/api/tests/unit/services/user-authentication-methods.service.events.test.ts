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

function buildService() {
  const userAuthenticationMethodRepository = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([
      {
        id: methodId,
        userId,
        provider: UserAuthenticationMethodProvider.Email,
        providerData: { hashedPassword: 'hashed-old' },
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
});
