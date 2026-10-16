import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const userId = '10000000-0000-4000-8000-0000000000a0';
const methodId = '10000000-0000-4000-8000-0000000000a1';

function buildService(reason: 'change' | 'set' = 'change') {
  const userAuthenticationMethodRepository = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([
      {
        id: methodId,
        userId,
        provider: UserAuthenticationMethodProvider.Email,
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

  const credentials = {
    changePlatformPassword: vi.fn().mockResolvedValue({ reason }),
  } as unknown as ICredentialService;

  return {
    service: new UserAuthenticationMethodService(
      userAuthenticationMethodRepository,
      {} as IUserSessionRepository,
      audit,
      events,
      credentials
    ),
    events,
    credentials,
    userAuthenticationMethodRepository,
  };
}

describe('UserAuthenticationMethodService security events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('changes the password through the credential service and publishes user.password_changed', async () => {
    const { service, events, credentials, userAuthenticationMethodRepository } = buildService();

    await service.changePassword(userId, 'CurrentPass1!', 'NewPass1!');

    expect(credentials.changePlatformPassword).toHaveBeenCalledWith(
      { userId, currentPassword: 'CurrentPass1!', newPassword: 'NewPass1!' },
      undefined
    );
    // The hash is not in the Email method any more: the method row is never rewritten.
    expect(
      userAuthenticationMethodRepository.updateUserAuthenticationMethod
    ).not.toHaveBeenCalled();
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

  it('reports a first set with reason "set"', async () => {
    const { service, events, credentials } = buildService('set');

    await service.changePassword(userId, undefined, 'NewPass1!');

    expect(credentials.changePlatformPassword).toHaveBeenCalledWith(
      { userId, currentPassword: undefined, newPassword: 'NewPass1!' },
      undefined
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ data: { after: { userId, reason: 'set' } } }),
      undefined
    );
  });

  it('publishes nothing when the credential service refuses the change', async () => {
    const { service, events, credentials } = buildService();
    vi.mocked(credentials.changePlatformPassword).mockRejectedValue(
      new Error('Current password is required')
    );

    await expect(service.changePassword(userId, undefined, 'NewPass1!')).rejects.toThrow(
      'Current password is required'
    );
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('passes the caller transaction through to the credential service', async () => {
    const { service, credentials } = buildService();
    const transaction = { marker: 'tx' };

    await service.changePassword(userId, 'CurrentPass1!', 'NewPass1!', transaction as never);

    expect(credentials.changePlatformPassword).toHaveBeenCalledWith(expect.anything(), transaction);
  });
});
