/**
 * Platform password flows of the Email method after the ADR 0011 cut-over: the hash never
 * touches `providerData`, a reset token is stored as a digest and found by it, and a
 * rejected password is never echoed.
 */
import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashToken } from '@/lib/token.lib';
import { UserAuthenticationMethodService } from '@/services/user-authentication-methods.service';

const userId = '10000000-0000-4000-8000-0000000000a0';
const methodId = '10000000-0000-4000-8000-0000000000a1';
const PASSWORD = 'Correct-Horse-7-Staple!';
const EMAIL = 'ada@example.com';

function emailMethod(providerData: Record<string, unknown> = {}) {
  return {
    id: methodId,
    userId,
    provider: UserAuthenticationMethodProvider.Email,
    providerId: EMAIL,
    providerData,
    isVerified: false,
    isPrimary: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function build(options: { found?: ReturnType<typeof emailMethod> | null } = {}) {
  const repository = {
    findByPasswordResetTokenHash: vi.fn().mockResolvedValue(options.found ?? null),
    findByProviderAndProviderId: vi.fn().mockResolvedValue(options.found ?? null),
    updateUserAuthenticationMethod: vi.fn().mockResolvedValue(undefined),
    // A scan over every Email method is the thing that must be gone.
    getUserAuthenticationMethods: vi.fn().mockRejectedValue(new Error('must not scan')),
  };
  const events = { publish: vi.fn() };
  const credentials = {
    setPassword: vi.fn().mockResolvedValue({}),
    hasCredential: vi.fn().mockResolvedValue(true),
    removeCredential: vi.fn().mockResolvedValue(true),
  };
  const service = new UserAuthenticationMethodService(
    repository as unknown as IUserAuthenticationMethodRepository,
    {} as IUserSessionRepository,
    {
      logUpdate: vi.fn(),
      logCreate: vi.fn(),
      logSoftDelete: vi.fn(),
      logHardDelete: vi.fn(),
    } as unknown as IAuditLogger,
    events as unknown as IEventPublisher,
    credentials as unknown as ICredentialService
  );
  return { service, repository, events, credentials };
}

describe('UserAuthenticationMethodService platform password flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processProvider (register and connect)', () => {
    it.each(['register', 'connect'])(
      'returns the validated password for the caller and keeps it out of providerData (%s)',
      async (action) => {
        const { service } = build();
        const result = await service.processProvider(
          UserAuthenticationMethodProvider.Email,
          EMAIL,
          { password: PASSWORD, action }
        );

        expect(result.password).toBe(PASSWORD);
        expect(Object.keys(result.providerData)).toEqual(['otp']);
        expect(JSON.stringify(result.providerData)).not.toContain(PASSWORD);
        expect(JSON.stringify(result.providerData)).not.toContain('hashedPassword');
      }
    );

    it('does not return a password for a login, which only carries what to verify', async () => {
      const { service } = build();
      const result = await service.processProvider(UserAuthenticationMethodProvider.Email, EMAIL, {
        password: 'whatever',
        action: 'login',
      });
      expect(result.password).toBeUndefined();
      expect(result.providerData).toEqual({ password: 'whatever' });
    });

    it('rejects a weak password without echoing it', async () => {
      const { service } = build();
      const weak = 'weakpass';
      const failure = await service
        .processProvider(UserAuthenticationMethodProvider.Email, EMAIL, {
          password: weak,
          action: 'register',
        })
        .catch((error: unknown) => error as Error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).not.toContain(weak);
      expect((failure as Error).message).not.toContain('Sample data');
    });

    it('does not echo a password when the rest of the provider data is invalid', async () => {
      const { service } = build();
      const failure = await service
        .processProvider(UserAuthenticationMethodProvider.Email, EMAIL, {
          password: PASSWORD,
          action: 'not-an-action',
        })
        .catch((error: unknown) => error as Error);

      expect(failure).toBeInstanceOf(Error);
      expect((failure as Error).message).not.toContain(PASSWORD);
    });
  });

  describe('requestPasswordReset', () => {
    it('stores a digest of the token, never the token', async () => {
      const { service, repository } = build({ found: emailMethod() });

      const otp = await service.requestPasswordReset(EMAIL);

      expect(otp).toMatchObject({ token: expect.any(String), validUntil: expect.any(Number) });
      const stored = repository.updateUserAuthenticationMethod.mock.calls[0][1].providerData;
      expect(stored.passwordResetOtp).toEqual({
        tokenHash: hashToken(otp!.token),
        validUntil: otp!.validUntil,
      });
      expect(JSON.stringify(stored)).not.toContain(otp!.token);
    });
  });

  describe('resetPassword', () => {
    const TOKEN = 'a'.repeat(64);

    function storedReset(overrides: Record<string, unknown> = {}) {
      return emailMethod({
        passwordResetOtp: {
          tokenHash: hashToken(TOKEN),
          validUntil: Date.now() + 60_000,
          ...overrides,
        },
      });
    }

    it('looks the token up by its digest (no scan) and writes the platform credential', async () => {
      const { service, repository, credentials, events } = build({ found: storedReset() });

      await expect(service.resetPassword(TOKEN, PASSWORD)).resolves.toBe(userId);

      expect(repository.findByPasswordResetTokenHash).toHaveBeenCalledWith(
        hashToken(TOKEN),
        undefined
      );
      expect(repository.getUserAuthenticationMethods).not.toHaveBeenCalled();
      expect(credentials.setPassword).toHaveBeenCalledWith(
        { scope: { scope: 'platform' }, userId, password: PASSWORD, source: 'reset' },
        undefined
      );
      // The token is consumed, and no hash is ever put back into the method.
      const written = repository.updateUserAuthenticationMethod.mock.calls[0][1].providerData;
      expect(written).toEqual({});
      expect(events.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'user.password_changed',
          data: { after: { userId, reason: 'reset' } },
        }),
        undefined
      );
    });

    it('does not match an old plain-text token record', async () => {
      // A pre-cut-over row kept `passwordResetOtp.token`; it has no digest, so it is refused.
      const legacy = emailMethod({
        passwordResetOtp: { token: TOKEN, validUntil: Date.now() + 60_000 },
      });
      const { service, credentials } = build({ found: legacy });

      await expect(service.resetPassword(TOKEN, PASSWORD)).resolves.toBeNull();
      expect(credentials.setPassword).not.toHaveBeenCalled();
    });

    it('returns null for an unknown token, an expired token and a digest mismatch', async () => {
      const unknown = build({ found: null });
      await expect(unknown.service.resetPassword(TOKEN, PASSWORD)).resolves.toBeNull();

      const expired = build({ found: storedReset({ validUntil: Date.now() - 1 }) });
      await expect(expired.service.resetPassword(TOKEN, PASSWORD)).resolves.toBeNull();

      const mismatch = build({ found: storedReset({ tokenHash: hashToken('different') }) });
      await expect(mismatch.service.resetPassword(TOKEN, PASSWORD)).resolves.toBeNull();

      for (const attempt of [unknown, expired, mismatch]) {
        expect(attempt.credentials.setPassword).not.toHaveBeenCalled();
        expect(attempt.repository.updateUserAuthenticationMethod).not.toHaveBeenCalled();
      }
    });

    it('refuses a non-string or empty token before touching the database', async () => {
      const { service, repository } = build();
      await expect(service.resetPassword('', PASSWORD)).resolves.toBeNull();
      await expect(service.resetPassword(undefined as never, PASSWORD)).resolves.toBeNull();
      expect(repository.findByPasswordResetTokenHash).not.toHaveBeenCalled();
    });

    it('rejects a weak new password without echoing it and without looking the token up', async () => {
      const { service, repository } = build({ found: storedReset() });
      const failure = await service.resetPassword(TOKEN, 'weak').catch((error: unknown) => error);

      expect((failure as Error).message).toMatch(/Input validation failed/);
      expect((failure as Error).message).not.toContain('Sample data');
      expect(repository.findByPasswordResetTokenHash).not.toHaveBeenCalled();
    });

    it('does not set isVerified', async () => {
      const { service, repository } = build({ found: storedReset() });
      await service.resetPassword(TOKEN, PASSWORD);
      expect(repository.updateUserAuthenticationMethod.mock.calls[0][1]).not.toHaveProperty(
        'isVerified'
      );
    });
  });

  describe('hasPlatformPassword', () => {
    it('is "a platform credential exists"', async () => {
      const { service, credentials } = build();
      await expect(service.hasPlatformPassword(userId)).resolves.toBe(true);
      expect(credentials.hasCredential).toHaveBeenCalledWith(
        { scope: 'platform' },
        userId,
        undefined
      );
    });
  });

  describe('deleteUserAuthenticationMethod', () => {
    function buildForDelete(provider: UserAuthenticationMethodProvider) {
      const deleted = { ...emailMethod(), provider, isPrimary: false, deletedAt: new Date() };
      const other = { ...emailMethod(), id: 'other-method', isPrimary: true };
      const { service, repository, credentials } = build();
      Object.assign(repository, {
        getUserAuthenticationMethod: vi.fn().mockResolvedValue({ ...deleted, deletedAt: null }),
        getUserAuthenticationMethods: vi.fn().mockResolvedValue([deleted, other]),
        softDeleteUserAuthenticationMethod: vi.fn().mockResolvedValue(deleted),
        hardDeleteUserAuthenticationMethod: vi.fn().mockResolvedValue(deleted),
      });
      return { service, credentials };
    }

    it('removes the platform password together with the Email method it belonged to', async () => {
      const { service, credentials } = buildForDelete(UserAuthenticationMethodProvider.Email);

      await service.deleteUserAuthenticationMethod({ id: methodId } as never);

      expect(credentials.removeCredential).toHaveBeenCalledWith(
        { scope: 'platform' },
        userId,
        undefined
      );
    });

    it('leaves the platform password alone when an OAuth method is removed', async () => {
      const { service, credentials } = buildForDelete(UserAuthenticationMethodProvider.Github);

      await service.deleteUserAuthenticationMethod({ id: methodId } as never);

      expect(credentials.removeCredential).not.toHaveBeenCalled();
    });
  });
});
