import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/lib/errors';
import { UserMfaService } from '@/services/user-mfa.service';

const mockFactorRepo = {
  removeFactor: vi.fn(),
  listFactors: vi.fn(),
};
const mockRecoveryRepo = {
  softDeleteAllCodes: vi.fn(),
};
const mockAudit = {
  logAction: vi.fn(),
  logCreate: vi.fn(),
  logUpdate: vi.fn(),
};

function createService(): UserMfaService {
  return new UserMfaService(
    mockFactorRepo as never,
    mockRecoveryRepo as never,
    mockAudit as never,
    { publish: vi.fn() } as never
  );
}

describe('UserMfaService removeDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('revokes recovery codes and emits MFA_DISABLED audit when no active factors remain', async () => {
    mockFactorRepo.removeFactor.mockResolvedValue({
      id: 'factor-1',
      userId: 'user-1',
      deletedAt: new Date(),
      type: 'totp',
    } as never);
    mockFactorRepo.listFactors.mockResolvedValue([
      { id: 'f1', deletedAt: new Date(), type: 'totp' },
    ]);

    const service = createService();
    await service.removeDevice('user-1', 'factor-1');

    expect(mockRecoveryRepo.softDeleteAllCodes).toHaveBeenCalledWith('user-1', undefined);
    expect(mockAudit.logAction).toHaveBeenCalledWith(
      {
        entityId: 'user-1',
        action: 'MFA_DISABLED',
        metadata: { reason: 'last_factor_removed' },
      },
      undefined
    );
  });

  it('does not revoke recovery codes when at least one active factor remains', async () => {
    mockFactorRepo.removeFactor.mockResolvedValue({
      id: 'factor-1',
      userId: 'user-1',
      deletedAt: new Date(),
      type: 'totp',
    } as never);
    mockFactorRepo.listFactors.mockResolvedValue([{ id: 'f2', deletedAt: null, type: 'totp' }]);

    const service = createService();
    await service.removeDevice('user-1', 'factor-1');

    expect(mockRecoveryRepo.softDeleteAllCodes).not.toHaveBeenCalled();
    expect(mockAudit.logAction).not.toHaveBeenCalled();
  });

  it('propagates NotFoundError when the factor does not exist or is not owned by the user', async () => {
    mockFactorRepo.removeFactor.mockRejectedValue(new NotFoundError('MFA factor', 'factor-x'));

    const service = createService();
    await expect(service.removeDevice('user-1', 'factor-x')).rejects.toThrow(NotFoundError);
    expect(mockRecoveryRepo.softDeleteAllCodes).not.toHaveBeenCalled();
  });
});

describe('UserMfaService hasActiveMfaEnrollment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when any non-deleted factor is enabled (non-primary counts)', async () => {
    mockFactorRepo.listFactors.mockResolvedValue([
      { id: 'f1', deletedAt: null, isEnabled: true, isPrimary: false, type: 'totp' },
    ]);

    const service = createService();
    await expect(service.hasActiveMfaEnrollment('user-1')).resolves.toBe(true);
  });

  it('returns false when only disabled or deleted factors exist', async () => {
    mockFactorRepo.listFactors.mockResolvedValue([
      { id: 'f1', deletedAt: null, isEnabled: false, isPrimary: true, type: 'totp' },
      { id: 'f2', deletedAt: new Date(), isEnabled: true, isPrimary: false, type: 'totp' },
    ]);

    const service = createService();
    await expect(service.hasActiveMfaEnrollment('user-1')).resolves.toBe(false);
  });
});
