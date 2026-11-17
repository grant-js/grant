import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Transaction } from '@/lib/transaction-manager.lib';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const userId = '10000000-0000-4000-8000-0000000000c0';
const methodId = '10000000-0000-4000-8000-0000000000c1';
const sessionId = '10000000-0000-4000-8000-0000000000c2';
const now = new Date('2026-01-01T00:00:00.000Z');
const tx = {} as Transaction;

function emailMethod(overrides: Record<string, unknown> = {}) {
  return {
    id: methodId,
    userId,
    provider: UserAuthenticationMethodProvider.Email,
    providerId: 'imported@example.com',
    providerData: { otp: { token: 'otp', validUntil: 1 }, passwordResetOtp: { tokenHash: 'h' } },
    isVerified: false,
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function setup(method = emailMethod()) {
  const repository = {
    getUserAuthenticationMethod: vi.fn().mockResolvedValue(method),
    updateUserAuthenticationMethod: vi
      .fn()
      .mockImplementation(async (_id: string, input: Record<string, unknown>) => ({
        ...method,
        ...input,
      })),
  };
  const sessions = {
    getUserSessions: vi.fn().mockResolvedValue({ userSessions: [{ id: sessionId }] }),
    softDeleteUserSession: vi.fn().mockResolvedValue(undefined),
  };
  const audit = { logUpdate: vi.fn() };
  const events = { publish: vi.fn(), publishMany: vi.fn(), resolveLinkedProjectIds: vi.fn() };
  const credentials = { removeCredential: vi.fn().mockResolvedValue(true) };

  const service = new UserAuthenticationMethodService(
    repository as unknown as IUserAuthenticationMethodRepository,
    sessions as unknown as IUserSessionRepository,
    audit as unknown as IAuditLogger,
    events as unknown as IEventPublisher,
    credentials as unknown as ICredentialService
  );

  return { service, repository, sessions, audit, events, credentials };
}

describe('UserAuthenticationMethodService.claimUnverifiedEmailMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('verifies the method and drops its pending OTP', async () => {
    const { service, repository } = setup();

    const claimed = await service.claimUnverifiedEmailMethod({ methodId, proof: 'google' }, tx);

    expect(repository.updateUserAuthenticationMethod).toHaveBeenCalledWith(
      methodId,
      { isVerified: true, providerData: { passwordResetOtp: { tokenHash: 'h' } } },
      tx
    );
    expect(claimed.isVerified).toBe(true);
  });

  it('records the claim and its proof on the audit row', async () => {
    const { service, audit } = setup();

    await service.claimUnverifiedEmailMethod({ methodId, proof: 'organization-invitation' }, tx);

    expect(audit.logUpdate).toHaveBeenCalledWith(
      methodId,
      expect.objectContaining({ isVerified: false }),
      expect.objectContaining({ isVerified: true }),
      expect.objectContaining({
        operation: 'claim-unverified-email',
        proof: 'organization-invitation',
      }),
      tx
    );
  });

  it('removes the platform credential and revokes sessions set before the proof', async () => {
    const { service, credentials, sessions, events } = setup();

    await service.claimUnverifiedEmailMethod({ methodId, proof: 'github' }, tx);

    expect(credentials.removeCredential).toHaveBeenCalledWith({ scope: 'platform' }, userId, tx);
    expect(sessions.softDeleteUserSession).toHaveBeenCalledWith({ id: sessionId }, tx);
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user.sessions_revoked', subjectUserId: userId }),
      tx
    );
  });

  it.each([
    ['a verified Email method', emailMethod({ isVerified: true })],
    ['a social method', emailMethod({ provider: UserAuthenticationMethodProvider.Google })],
  ])('refuses %s and writes nothing', async (_label, method) => {
    const { service, repository, credentials, sessions } = setup(method);

    await expect(
      service.claimUnverifiedEmailMethod({ methodId, proof: 'google' }, tx)
    ).rejects.toThrow('Email method is not claimable');

    expect(repository.updateUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(credentials.removeCredential).not.toHaveBeenCalled();
    expect(sessions.softDeleteUserSession).not.toHaveBeenCalled();
  });
});
