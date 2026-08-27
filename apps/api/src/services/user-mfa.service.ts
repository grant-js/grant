import {
  IAuditLogger,
  IEventPublisher,
  ISecretResolver,
  IUserMfaFactorRepository,
  IUserMfaRecoveryCodeRepository,
  IUserMfaService,
  MfaDeviceInfo,
  MfaSetupResult,
} from '@grantjs/core';

import { config } from '@/config';
import { AuthenticationError, ConfigurationError } from '@/lib/errors';
import {
  buildOtpauthUrl,
  decryptMfaSecret,
  encryptMfaSecret,
  generateTotpSecret,
  verifyTotpCode,
} from '@/lib/mfa.lib';
import { generateRandomBytes, hashSecret, verifySecret } from '@/lib/token.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

export class UserMfaService implements IUserMfaService {
  constructor(
    private readonly userMfaFactorRepository: IUserMfaFactorRepository,
    private readonly userMfaRecoveryCodeRepository: IUserMfaRecoveryCodeRepository,
    private readonly audit: IAuditLogger,
    private readonly events: IEventPublisher,
    private readonly secrets: ISecretResolver
  ) {}

  /**
   * Resolved per use rather than read once at boot, so a rotated key is picked up
   * without a redeploy. The `env` resolver makes this a plain `process.env` read.
   */
  private async requireEncryptionKey(): Promise<string> {
    const encryptionKey = await this.secrets.resolve('AUTH_MFA_SECRET_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new ConfigurationError('AUTH_MFA_SECRET_ENCRYPTION_KEY must be configured');
    }
    return encryptionKey;
  }

  public async listDevices(userId: string, transaction?: Transaction): Promise<MfaDeviceInfo[]> {
    const devices = await this.userMfaFactorRepository.listFactors(userId, transaction);
    return devices
      .filter((d) => !d.deletedAt)
      .map((d) => ({
        id: d.id,
        name: `${d.type.toUpperCase()} device`,
        isPrimary: d.isPrimary,
        isEnabled: d.isEnabled,
        createdAt: d.createdAt,
        lastUsedAt: d.lastUsedAt ?? null,
      }));
  }

  public async setupTotp(
    userId: string,
    accountName: string,
    transaction?: Transaction
  ): Promise<MfaSetupResult> {
    const encryptionKey = await this.requireEncryptionKey();
    const secret = generateTotpSecret();
    const encrypted = encryptMfaSecret(secret, encryptionKey);
    const factor = await this.userMfaFactorRepository.upsertPrimaryFactor(
      {
        userId,
        type: 'totp',
        isEnabled: false,
        ...encrypted,
      },
      transaction
    );
    await this.audit.logCreate(
      factor.id,
      factor as unknown as Record<string, unknown>,
      { type: 'totp_setup' },
      transaction
    );
    return {
      factorId: factor.id,
      secret,
      otpAuthUrl: buildOtpauthUrl({ issuer: config.auth.mfa.totpIssuer, accountName, secret }),
    };
  }

  public async verifyTotp(
    userId: string,
    code: string,
    transaction?: Transaction
  ): Promise<{ factorId: string; verified: boolean }> {
    const encryptionKey = await this.requireEncryptionKey();
    const factor = await this.userMfaFactorRepository.getPrimaryFactor(userId, transaction);
    if (!factor) {
      throw new AuthenticationError('MFA factor not set up');
    }
    const secret = decryptMfaSecret({
      encryptedSecret: factor.encryptedSecret,
      secretIv: factor.secretIv,
      secretTag: factor.secretTag,
      key: encryptionKey,
    });
    const isValid = verifyTotpCode({
      secret,
      code,
      periodSeconds: config.auth.mfa.totpPeriodSeconds,
      window: config.auth.mfa.totpWindow,
    });
    if (!isValid) {
      return { factorId: factor.id, verified: false };
    }
    const wasEnabled = factor.isEnabled;
    if (!wasEnabled) {
      await this.userMfaFactorRepository.enableFactor(factor.id, transaction);
    }
    await this.userMfaFactorRepository.touchFactorLastUsed(factor.id, transaction);
    await this.audit.logUpdate(
      factor.id,
      factor as unknown as Record<string, unknown>,
      { ...(factor as unknown as Record<string, unknown>), isEnabled: true },
      {},
      transaction
    );
    if (!wasEnabled) {
      await this.events.publish(
        {
          type: 'user.mfa_enabled',
          subjectUserId: userId,
          aggregate: { kind: 'userMfaFactor', id: factor.id },
          data: { after: { userId, factorId: factor.id, type: factor.type } },
        },
        transaction
      );
    }
    return { factorId: factor.id, verified: true };
  }

  public async setPrimaryDevice(
    userId: string,
    factorId: string,
    transaction?: Transaction
  ): Promise<MfaDeviceInfo> {
    const updated = await this.userMfaFactorRepository.setPrimaryFactor(
      factorId,
      userId,
      transaction
    );
    return {
      id: updated.id,
      name: `${updated.type.toUpperCase()} device`,
      isPrimary: updated.isPrimary,
      isEnabled: updated.isEnabled,
      createdAt: updated.createdAt,
      lastUsedAt: updated.lastUsedAt ?? null,
    };
  }

  public async removeDevice(
    userId: string,
    factorId: string,
    transaction?: Transaction
  ): Promise<void> {
    await this.userMfaFactorRepository.removeFactor(factorId, userId, transaction);
    const remaining = await this.userMfaFactorRepository.listFactors(userId, transaction);
    const activeFactors = remaining.filter((f) => !f.deletedAt);
    if (activeFactors.length === 0) {
      await this.userMfaRecoveryCodeRepository.softDeleteAllCodes(userId, transaction);
      await this.audit.logAction(
        {
          entityId: userId,
          action: 'MFA_DISABLED',
          metadata: { reason: 'last_factor_removed' },
        },
        transaction
      );
      await this.events.publish(
        {
          type: 'user.mfa_disabled',
          subjectUserId: userId,
          aggregate: { kind: 'user', id: userId },
          data: { after: { userId, reason: 'last_factor_removed' } },
        },
        transaction
      );
    }
  }

  public async generateRecoveryCodes(
    userId: string,
    factorId?: string | null,
    transaction?: Transaction
  ): Promise<string[]> {
    const codes = Array.from({ length: 8 }).map(() =>
      generateRandomBytes(5).toString('hex').toUpperCase()
    );
    const hashes = codes.map((code) => hashSecret(code));
    await this.userMfaRecoveryCodeRepository.softDeleteAllCodes(userId, transaction);
    await this.userMfaRecoveryCodeRepository.createCodes(userId, hashes, factorId, transaction);
    await this.events.publish(
      {
        type: 'user.mfa_recovery_codes_regenerated',
        subjectUserId: userId,
        aggregate: { kind: 'user', id: userId },
        data: { after: { userId, codeCount: codes.length } },
      },
      transaction
    );
    return codes;
  }

  public async verifyRecoveryCode(
    userId: string,
    recoveryCode: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const codes = await this.userMfaRecoveryCodeRepository.listCodes(userId, transaction);
    const match = codes.find((c) => verifySecret(recoveryCode, c.codeHash));
    if (!match) return false;
    await this.userMfaRecoveryCodeRepository.markCodeUsed(match.id, transaction);
    return true;
  }

  public async getMyMfaRecoveryCodeStatus(
    userId: string,
    transaction?: Transaction
  ): Promise<{ activeCount: number; lastGeneratedAt: Date | null }> {
    return this.userMfaRecoveryCodeRepository.getRecoveryCodeStatus(userId, transaction);
  }

  public async hasActiveMfaEnrollment(userId: string, transaction?: Transaction): Promise<boolean> {
    const factors = await this.userMfaFactorRepository.listFactors(userId, transaction);
    return factors.some((f) => !f.deletedAt && f.isEnabled);
  }
}
