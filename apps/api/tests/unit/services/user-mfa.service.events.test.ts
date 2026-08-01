import type {
  IAuditLogger,
  IEventPublisher,
  IUserMfaFactorRepository,
  IUserMfaRecoveryCodeRepository,
} from '@grantjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mfa.lib', () => ({
  decryptMfaSecret: vi.fn().mockReturnValue('SECRET'),
  verifyTotpCode: vi.fn().mockReturnValue(true),
  encryptMfaSecret: vi.fn(),
  generateTotpSecret: vi.fn(),
  buildOtpauthUrl: vi.fn(),
}));

vi.mock('@/config', () => ({
  config: {
    auth: {
      mfa: {
        secretEncryptionKey: '0123456789abcdef0123456789abcdef',
        totpPeriodSeconds: 30,
        totpWindow: 1,
        totpIssuer: 'Grant',
      },
    },
  },
}));

import { UserMfaService } from '@/services/user-mfa.service';

const userId = '10000000-0000-4000-8000-000000000080';
const factorId = '10000000-0000-4000-8000-000000000081';

function buildService() {
  const userMfaFactorRepository = {
    getPrimaryFactor: vi.fn().mockResolvedValue({
      id: factorId,
      userId,
      type: 'totp',
      isEnabled: false,
      encryptedSecret: 'enc',
      secretIv: 'iv',
      secretTag: 'tag',
    }),
    enableFactor: vi.fn().mockResolvedValue(undefined),
    touchFactorLastUsed: vi.fn().mockResolvedValue(undefined),
  } as unknown as IUserMfaFactorRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logAction: vi.fn(),
  } as unknown as IAuditLogger;

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  return {
    service: new UserMfaService(
      userMfaFactorRepository,
      {} as IUserMfaRecoveryCodeRepository,
      audit,
      events
    ),
    events,
    userMfaFactorRepository,
  };
}

describe('UserMfaService security events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes user.mfa_enabled when verifyTotp enables MFA for the first time', async () => {
    const { service, events } = buildService();

    await service.verifyTotp(userId, '123456');

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user.mfa_enabled',
        subjectUserId: userId,
        aggregate: { kind: 'userMfaFactor', id: factorId },
      }),
      undefined
    );
  });
});
