import type { IApiKeyRepository, IAuditLogger, IEventPublisher } from '@grantjs/core';
import { type ApiKey, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '@/lib/errors';
import { hashSecret } from '@/lib/token.lib';
import { ApiKeyService } from '@/services/api-keys.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000002';
const accountId = '10000000-0000-4000-8000-000000000003';
const clientId = '10000000-0000-4000-8000-000000000004';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const createdBy = '10000000-0000-4000-8000-000000000006';
const clientSecret = 's'.repeat(32);

function apiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: apiKeyId,
    clientId,
    name: null,
    description: null,
    expiresAt: null,
    lastUsedAt: null,
    isRevoked: false,
    revokedAt: null,
    revokedBy: null,
    createdBy,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
    ...overrides,
  };
}

function buildService(repositoryOverrides: Partial<IApiKeyRepository> = {}) {
  const apiKeyRepository = {
    findByClientId: vi.fn(),
    findActiveByClientId: vi.fn(),
    findActiveProjectUserApiKeysByClientId: vi.fn().mockResolvedValue([]),
    findActiveAccountProjectApiKeysByClientId: vi.fn().mockResolvedValue([]),
    findActiveOrganizationProjectApiKeysByClientId: vi.fn().mockResolvedValue([]),
    getClientSecretHash: vi.fn().mockResolvedValue(hashSecret(clientSecret)),
    createApiKey: vi.fn().mockImplementation(async (params) => apiKey(params)),
    updateLastUsedAt: vi.fn().mockImplementation(async (id) => apiKey({ id })),
    updateClientSecretHash: vi.fn().mockImplementation(async (id) => apiKey({ id })),
    getApiKeys: vi.fn(),
    getApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    softDeleteApiKey: vi.fn(),
    hardDeleteApiKey: vi.fn(),
    ...repositoryOverrides,
  } satisfies IApiKeyRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  } as unknown as IAuditLogger;

  const grant = {
    signApiKeyToken: vi.fn().mockResolvedValue('access-token'),
  };

  const events = {
    publish: vi.fn(),
  } as unknown as IEventPublisher;

  const service = new ApiKeyService(
    {
      getFirstByProjectId: vi.fn().mockResolvedValue({ accountId, projectId }),
    } as never,
    {
      getFirstByProjectId: vi.fn().mockResolvedValue(null),
    } as never,
    apiKeyRepository,
    null,
    audit,
    grant as never,
    events
  );

  return { service, apiKeyRepository, grant, events };
}

describe('ApiKeyService scoped client ids', () => {
  it('exchanges the API key resolved through the requested project-user scope', async () => {
    const scopedKey = apiKey();
    const { service, apiKeyRepository, grant } = buildService({
      findActiveProjectUserApiKeysByClientId: vi.fn().mockResolvedValue([scopedKey]),
    });

    await expect(
      service.exchangeApiKeyForToken({
        clientId,
        clientSecret,
        scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
      })
    ).resolves.toEqual({ accessToken: 'access-token', expiresIn: expect.any(Number) });

    expect(apiKeyRepository.findActiveByClientId).not.toHaveBeenCalled();
    expect(apiKeyRepository.findActiveProjectUserApiKeysByClientId).toHaveBeenCalledWith(
      { clientId, projectId, userId },
      undefined
    );
    expect(grant.signApiKeyToken).toHaveBeenCalledWith(
      expect.objectContaining({ jti: scopedKey.id, sub: userId }),
      expect.any(Object)
    );
  });

  it('fails closed when a scope has ambiguous active keys for one client id', async () => {
    const { service, apiKeyRepository } = buildService({
      findActiveProjectUserApiKeysByClientId: vi
        .fn()
        .mockResolvedValue([apiKey(), apiKey({ id: '10000000-0000-4000-8000-000000000007' })]),
    });

    await expect(
      service.exchangeApiKeyForToken({
        clientId,
        clientSecret,
        scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
      })
    ).rejects.toThrow('Invalid credentials');

    expect(apiKeyRepository.getClientSecretHash).not.toHaveBeenCalled();
  });

  it('rejects a CDM import when the same scope already has the client id', async () => {
    const tx = { execute: vi.fn() };
    const { service } = buildService({
      findActiveProjectUserApiKeysByClientId: vi.fn().mockResolvedValue([apiKey()]),
    });

    await expect(
      service.createApiKeyForCdmImport(
        {
          clientId,
          clientSecret,
          scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
        },
        tx as never
      )
    ).rejects.toBeInstanceOf(ConflictError);

    expect(tx.execute).toHaveBeenCalledOnce();
  });

  it('allows a CDM import when another scope has the same client id', async () => {
    const tx = { execute: vi.fn() };
    const { service, apiKeyRepository } = buildService({
      findActiveProjectUserApiKeysByClientId: vi.fn().mockResolvedValue([]),
    });

    await expect(
      service.createApiKeyForCdmImport(
        {
          clientId,
          clientSecret,
          scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
        },
        tx as never
      )
    ).resolves.toEqual(expect.objectContaining({ clientId, clientSecret }));

    expect(apiKeyRepository.findByClientId).not.toHaveBeenCalled();
    expect(apiKeyRepository.createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({ clientId }),
      tx
    );
  });
});

describe('ApiKeyService.rotateApiKey', () => {
  it('rotates the secret in place, publishes api_key.rotated, and returns the new secret', async () => {
    const existing = apiKey({ name: 'Prod key' });
    const { service, apiKeyRepository, events } = buildService({
      getApiKey: vi.fn().mockResolvedValue(existing),
      updateClientSecretHash: vi.fn().mockResolvedValue(existing),
    });

    const result = await service.rotateApiKey({ id: apiKeyId });

    expect(result.id).toBe(apiKeyId);
    expect(result.clientId).toBe(clientId);
    expect(result.clientSecret).toEqual(expect.any(String));
    expect(result.clientSecret.length).toBeGreaterThanOrEqual(32);
    expect(apiKeyRepository.updateClientSecretHash).toHaveBeenCalledWith(
      apiKeyId,
      expect.any(String),
      undefined
    );
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'api_key.rotated',
        aggregate: { kind: 'apiKey', id: apiKeyId },
        data: {
          before: expect.objectContaining({ id: apiKeyId, clientId, name: 'Prod key' }),
          after: expect.objectContaining({ id: apiKeyId, clientId, name: 'Prod key' }),
        },
      }),
      undefined
    );
  });

  it('rejects rotating a revoked API key', async () => {
    const { service, apiKeyRepository, events } = buildService({
      getApiKey: vi.fn().mockResolvedValue(apiKey({ isRevoked: true })),
    });

    await expect(service.rotateApiKey({ id: apiKeyId })).rejects.toThrow(
      'Cannot rotate a revoked API key'
    );
    expect(apiKeyRepository.updateClientSecretHash).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('rejects rotating a missing API key', async () => {
    const { service, apiKeyRepository } = buildService({
      getApiKey: vi.fn().mockResolvedValue(null),
    });

    await expect(service.rotateApiKey({ id: apiKeyId })).rejects.toThrow(/ApiKey/);
    expect(apiKeyRepository.updateClientSecretHash).not.toHaveBeenCalled();
  });
});
