import type {
  IAuditLogger,
  ICredentialService,
  IEventPublisher,
  IUserAuthenticationMethodRepository,
  IUserSessionRepository,
} from '@grantjs/core';
import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConflictError, ValidationError } from '@/lib/errors';
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
    isPrimary: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function buildService(repo: Partial<IUserAuthenticationMethodRepository> = {}) {
  const audit = { logCreate: vi.fn(), logUpdate: vi.fn() };
  const repository = {
    getUserAuthenticationMethods: vi.fn().mockResolvedValue([]),
    findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
    createUserAuthenticationMethod: vi.fn().mockResolvedValue(emailMethod({ isVerified: false })),
    updateUserAuthenticationMethod: vi.fn(),
    getUserAuthenticationMethod: vi.fn(),
    ...repo,
  };

  const service = new UserAuthenticationMethodService(
    repository as IUserAuthenticationMethodRepository,
    {} as IUserSessionRepository,
    audit as unknown as IAuditLogger,
    {
      publish: vi.fn(),
      publishMany: vi.fn(),
      resolveLinkedProjectIds: vi.fn(),
    } as IEventPublisher,
    {} as ICredentialService
  );

  return { service, repository, audit };
}

describe('UserAuthenticationMethodService.setOrReplaceEmailMethod', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes trim and lowercase', () => {
    const { service } = buildService();
    expect(service.normalizeOperatorEmail('  Ada@Example.COM ')).toBe('ada@example.com');
  });

  it('rejects an empty string as invalid, not absent', () => {
    const { service } = buildService();
    expect(() => service.normalizeOperatorEmail('')).toThrow(ValidationError);
    expect(() => service.normalizeOperatorEmail('   ')).toThrow(ValidationError);
  });

  it('adds an unverified Email method', async () => {
    const created = emailMethod({
      isVerified: false,
      isPrimary: true,
      providerId: 'ada@example.com',
    });
    const { service, repository } = buildService({
      createUserAuthenticationMethod: vi.fn().mockResolvedValue(created),
    });

    const result = await service.setOrReplaceEmailMethod({
      userId,
      email: '  Ada@Example.COM ',
      operation: 'operator-set-email',
    });

    expect(repository.createUserAuthenticationMethod).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        provider: UserAuthenticationMethodProvider.Email,
        providerId: 'ada@example.com',
        providerData: {},
        isVerified: false,
      }),
      undefined
    );
    expect(result.operation).toBe('added');
    expect(result.method.isVerified).toBe(false);
    expect(result.previousEmail).toBeUndefined();
  });

  it('is a no-op when the stored normalized address is unchanged', async () => {
    const existing = emailMethod();
    const { service, repository } = buildService({
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([existing]),
    });

    const result = await service.setOrReplaceEmailMethod({
      userId,
      email: 'ADA@example.com',
      operation: 'operator-set-email',
    });

    expect(result.operation).toBeNull();
    expect(result.previousEmail).toBeUndefined();
    expect(result.method).toEqual(expect.objectContaining({ id: methodId, isVerified: true }));
    expect(repository.createUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(repository.updateUserAuthenticationMethod).not.toHaveBeenCalled();
  });

  it('replaces an existing Email method as unverified', async () => {
    const existing = emailMethod();
    const updated = emailMethod({
      providerId: 'new@example.com',
      isVerified: false,
    });
    const { service, repository } = buildService({
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([existing]),
      getUserAuthenticationMethod: vi.fn().mockResolvedValue(existing),
      updateUserAuthenticationMethod: vi.fn().mockResolvedValue(updated),
    });

    const result = await service.setOrReplaceEmailMethod({
      userId,
      email: 'new@example.com',
      operation: 'operator-set-email',
    });

    expect(repository.updateUserAuthenticationMethod).toHaveBeenCalledWith(
      methodId,
      { providerId: 'new@example.com', isVerified: false },
      undefined
    );
    expect(result.operation).toBe('changed');
    expect(result.previousEmail).toBe(existing.providerId);
    expect(result.method.isVerified).toBe(false);
    expect(result.method.providerId).toBe('new@example.com');
  });

  it('names the operation on the audit row of a replaced address, with the old and new address', async () => {
    const existing = emailMethod();
    const updated = emailMethod({ providerId: 'new@example.com', isVerified: false });
    const { service, audit } = buildService({
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([existing]),
      getUserAuthenticationMethod: vi.fn().mockResolvedValue(existing),
      updateUserAuthenticationMethod: vi.fn().mockResolvedValue(updated),
    });

    await service.setOrReplaceEmailMethod({
      userId,
      email: 'new@example.com',
      operation: 'operator-set-email',
    });

    expect(audit.logUpdate).toHaveBeenCalledTimes(1);
    expect(audit.logCreate).not.toHaveBeenCalled();
    expect(audit.logUpdate).toHaveBeenCalledWith(
      methodId,
      expect.objectContaining({ providerId: 'ada@example.com' }),
      expect.objectContaining({ providerId: 'new@example.com', isVerified: false }),
      {
        context: 'UserAuthenticationMethodService.updateUserAuthenticationMethod',
        operation: 'operator-set-email',
      },
      undefined
    );
  });

  it('names the operation on the audit row of an added address', async () => {
    const { service, audit } = buildService();

    await service.setOrReplaceEmailMethod({
      userId,
      email: 'ada@example.com',
      operation: 'operator-create-user',
    });

    expect(audit.logCreate).toHaveBeenCalledTimes(1);
    expect(audit.logUpdate).not.toHaveBeenCalled();
    expect(audit.logCreate).toHaveBeenCalledWith(
      methodId,
      expect.objectContaining({ provider: UserAuthenticationMethodProvider.Email }),
      {
        context: 'UserAuthenticationMethodService.createUserAuthenticationMethod',
        operation: 'operator-create-user',
      },
      undefined
    );
  });

  it('writes no audit row when the address is unchanged or held by another account', async () => {
    const same = buildService({
      getUserAuthenticationMethods: vi.fn().mockResolvedValue([emailMethod()]),
    });
    await same.service.setOrReplaceEmailMethod({
      userId,
      email: 'ada@example.com',
      operation: 'operator-set-email',
    });
    expect(same.audit.logUpdate).not.toHaveBeenCalled();
    expect(same.audit.logCreate).not.toHaveBeenCalled();

    const held = buildService({
      findByProviderAndProviderId: vi.fn().mockResolvedValue(emailMethod({ userId: otherUserId })),
    });
    await expect(
      held.service.setOrReplaceEmailMethod({
        userId,
        email: 'ada@example.com',
        operation: 'operator-set-email',
      })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(held.audit.logUpdate).not.toHaveBeenCalled();
    expect(held.audit.logCreate).not.toHaveBeenCalled();
  });

  it('throws ConflictError when another account already holds the address', async () => {
    const { service, repository } = buildService({
      findByProviderAndProviderId: vi
        .fn()
        .mockResolvedValue(emailMethod({ userId: otherUserId, providerId: 'ada@example.com' })),
    });

    await expect(
      service.setOrReplaceEmailMethod({
        userId,
        email: 'ada@example.com',
        operation: 'operator-set-email',
      })
    ).rejects.toMatchObject({
      constructor: ConflictError,
      message: 'This authentication method is already connected to another account',
    });
    expect(repository.createUserAuthenticationMethod).not.toHaveBeenCalled();
    expect(repository.updateUserAuthenticationMethod).not.toHaveBeenCalled();
  });
});
