/**
 * MFA TOTP/recovery verify attempt budget (audit M3).
 *
 * Per-user rolling window from AUTH_MFA_VERIFY_MAX_ATTEMPTS /
 * AUTH_MFA_VERIFY_WINDOW_MINUTES. Record-before-verify in cache, shared by
 * TOTP and recovery. Platform and project both call this service.
 */
import type { ICacheAdapter } from '@grantjs/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVerifyTotpCode, mockAuthMfa } = vi.hoisted(() => ({
  mockVerifyTotpCode: vi.fn(() => false),
  mockAuthMfa: {
    secretEncryptionKey: '0123456789abcdef0123456789abcdef',
    totpPeriodSeconds: 30,
    totpWindow: 1,
    totpIssuer: 'Grant',
    verifyMaxAttempts: 5,
    verifyWindowMinutes: 15,
  },
}));

vi.mock('@/lib/mfa.lib', () => ({
  decryptMfaSecret: vi.fn().mockReturnValue('SECRET'),
  verifyTotpCode: mockVerifyTotpCode,
  encryptMfaSecret: vi.fn(),
  generateTotpSecret: vi.fn(),
  buildOtpauthUrl: vi.fn(),
}));

vi.mock('@/config', () => ({
  config: {
    auth: { mfa: mockAuthMfa },
    app: { isDevelopment: false },
    logging: { level: 'silent', prettyPrint: false },
    token: { bcryptRounds: 4 },
  },
}));

const { UserMfaService } = await import('@/services/user-mfa.service');
const { AuthenticationError } = await import('@/lib/errors');
const { MFA_VERIFY_ATTEMPT_KEY_PREFIX } = await import('@/constants/cache.constants');

const USER_ID = 'user-1';
const FACTOR_ID = 'factor-1';
const MAX = 5;

function memoryCache() {
  const store = new Map<string, { attempts: number[] }>();
  const cache = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: { attempts: number[] }) => {
      store.set(key, value);
    }),
    delete: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
  return { store, cache: cache as unknown as ICacheAdapter };
}

function buildService(cache: ICacheAdapter) {
  const factorRepo = {
    getPrimaryFactor: vi.fn().mockResolvedValue({
      id: FACTOR_ID,
      userId: USER_ID,
      type: 'totp',
      isEnabled: true,
      encryptedSecret: 'enc',
      secretIv: 'iv',
      secretTag: 'tag',
    }),
    enableFactor: vi.fn(),
    touchFactorLastUsed: vi.fn(),
  };
  const recoveryRepo = {
    listCodes: vi.fn().mockResolvedValue([{ id: 'code-1', codeHash: 'hash' }]),
    markCodeUsed: vi.fn(),
  };
  return {
    service: new UserMfaService(
      factorRepo as never,
      recoveryRepo as never,
      { logCreate: vi.fn(), logUpdate: vi.fn(), logAction: vi.fn() } as never,
      { publish: vi.fn() } as never,
      { resolve: () => Promise.resolve('0123456789abcdef0123456789abcdef') },
      cache
    ),
    factorRepo,
    recoveryRepo,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthMfa.verifyMaxAttempts = MAX;
  mockAuthMfa.verifyWindowMinutes = 15;
  mockVerifyTotpCode.mockReturnValue(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('UserMfaService MFA verify attempt budget', () => {
  it('records TOTP failures before the code check and refuses past the budget', async () => {
    const { cache, store } = memoryCache();
    const { service } = buildService(cache);

    for (let i = 0; i < MAX; i += 1) {
      await expect(service.verifyTotp(USER_ID, '000000')).resolves.toEqual({
        factorId: FACTOR_ID,
        verified: false,
      });
    }
    expect(mockVerifyTotpCode).toHaveBeenCalledTimes(MAX);

    mockVerifyTotpCode.mockClear();
    await expect(service.verifyTotp(USER_ID, '000000')).resolves.toEqual({
      factorId: FACTOR_ID,
      verified: false,
    });
    expect(mockVerifyTotpCode).not.toHaveBeenCalled();
    expect(store.get(`${MFA_VERIFY_ATTEMPT_KEY_PREFIX}${USER_ID}`)?.attempts).toHaveLength(MAX + 1);
  });

  it('clears the window after a successful TOTP so the user can verify again', async () => {
    const { cache, store } = memoryCache();
    const { service } = buildService(cache);
    mockVerifyTotpCode.mockReturnValueOnce(false).mockReturnValueOnce(true);

    await service.verifyTotp(USER_ID, '000000');
    await expect(service.verifyTotp(USER_ID, '123456')).resolves.toEqual({
      factorId: FACTOR_ID,
      verified: true,
    });
    expect(store.has(`${MFA_VERIFY_ATTEMPT_KEY_PREFIX}${USER_ID}`)).toBe(false);
  });

  it('shares one per-user window between TOTP and recovery', async () => {
    const { cache } = memoryCache();
    const { service, recoveryRepo } = buildService(cache);
    vi.spyOn(await import('@/lib/token.lib'), 'verifySecret').mockReturnValue(false);

    for (let i = 0; i < MAX; i += 1) {
      await service.verifyTotp(USER_ID, '000000');
    }
    recoveryRepo.listCodes.mockClear();
    await expect(service.verifyRecoveryCode(USER_ID, 'DEADBEEF')).resolves.toBe(false);
    expect(recoveryRepo.listCodes).not.toHaveBeenCalled();
  });

  it('allows attempts again after the rolling window lapses', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-24T15:00:00.000Z'));
    const { cache } = memoryCache();
    const { service } = buildService(cache);

    for (let i = 0; i < MAX; i += 1) {
      await service.verifyTotp(USER_ID, '000000');
    }
    mockVerifyTotpCode.mockClear();
    await service.verifyTotp(USER_ID, '000000');
    expect(mockVerifyTotpCode).not.toHaveBeenCalled();

    vi.setSystemTime(new Date('2026-10-24T15:16:00.000Z'));
    mockVerifyTotpCode.mockReturnValue(false);
    await service.verifyTotp(USER_ID, '000000');
    expect(mockVerifyTotpCode).toHaveBeenCalledTimes(1);
  });

  it('does not spend the budget when the user has no MFA factor', async () => {
    const { cache } = memoryCache();
    const { service, factorRepo } = buildService(cache);
    factorRepo.getPrimaryFactor.mockResolvedValue(null);

    await expect(service.verifyTotp(USER_ID, '123456')).rejects.toBeInstanceOf(AuthenticationError);
    expect(cache.set).not.toHaveBeenCalled();
    expect(mockVerifyTotpCode).not.toHaveBeenCalled();
  });

  it('clears the window after a successful recovery code', async () => {
    const { cache, store } = memoryCache();
    const { service, recoveryRepo } = buildService(cache);
    vi.spyOn(await import('@/lib/token.lib'), 'verifySecret').mockReturnValue(true);

    await expect(service.verifyRecoveryCode(USER_ID, 'GOODCODE')).resolves.toBe(true);
    expect(recoveryRepo.markCodeUsed).toHaveBeenCalledWith('code-1', undefined);
    expect(store.has(`${MFA_VERIFY_ATTEMPT_KEY_PREFIX}${USER_ID}`)).toBe(false);
  });
});
