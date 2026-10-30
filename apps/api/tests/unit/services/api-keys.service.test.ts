import type {
  IApiKeyExportableSecretService,
  IApiKeyRepository,
  IAuditLogger,
  IEventPublisher,
} from '@grantjs/core';
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
    getOwningUserIds: vi.fn().mockResolvedValue([]),
    createApiKey: vi.fn().mockImplementation(async (params) => apiKey(params)),
    createApiKeys: vi
      .fn()
      .mockImplementation(async (rows: Array<Partial<ApiKey>>) =>
        rows.map((row, index) => apiKey({ ...row, id: `${apiKeyId.slice(0, -1)}${index}` }))
      ),
    hardDeleteApiKeys: vi.fn(),
    updateLastUsedAt: vi.fn().mockImplementation(async (id) => apiKey({ id })),
    updateClientSecretHash: vi.fn().mockImplementation(async (id) => apiKey({ id })),
    setMissingClientSecretFingerprints: vi.fn(),
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
    resolveLinkedProjectIds: vi.fn().mockResolvedValue([]),
  } as unknown as IEventPublisher;

  const exportableSecrets = {
    isEnabled: vi.fn().mockResolvedValue(false),
    storeForKey: vi.fn(),
    removeForKeys: vi.fn().mockResolvedValue(0),
    removeForProject: vi.fn().mockResolvedValue(0),
    readForExport: vi.fn().mockResolvedValue([]),
  } satisfies IApiKeyExportableSecretService;

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
    events,
    exportableSecrets
  );

  return { service, apiKeyRepository, grant, events, exportableSecrets };
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
      null,
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

describe('ApiKeyService.deleteApiKey', () => {
  const projectIdB = '10000000-0000-4000-8000-000000000007';
  const otherUserId = '10000000-0000-4000-8000-000000000008';

  function buildDelete(owningUserIds: string[], hardDelete = false) {
    const existing = apiKey({ name: 'Prod key' });
    const built = buildService({
      getApiKey: vi.fn().mockResolvedValue(existing),
      getOwningUserIds: vi.fn().mockResolvedValue(owningUserIds),
      softDeleteApiKey: vi.fn().mockResolvedValue({ ...existing, deletedAt: new Date() }),
      hardDeleteApiKey: vi.fn().mockResolvedValue(existing),
    });
    vi.mocked(built.events.resolveLinkedProjectIds).mockResolvedValue([projectId, projectIdB]);
    return { ...built, hardDelete };
  }

  it('publishes api_key.deleted with the single owning user as subject and the project links read before the delete', async () => {
    const { service, apiKeyRepository, events } = buildDelete([userId]);
    const order: string[] = [];
    vi.mocked(events.resolveLinkedProjectIds).mockImplementation(async () => {
      order.push('resolve');
      return [projectId, projectIdB];
    });
    vi.mocked(apiKeyRepository.softDeleteApiKey).mockImplementation(async () => {
      order.push('delete');
      return apiKey({ deletedAt: new Date() });
    });

    await service.deleteApiKey({ id: apiKeyId });

    expect(order).toEqual(['resolve', 'delete']);
    expect(events.resolveLinkedProjectIds).toHaveBeenCalledWith(
      [{ kind: 'apiKey', id: apiKeyId }],
      undefined
    );
    expect(events.publish).toHaveBeenCalledWith(
      {
        type: 'api_key.deleted',
        aggregate: { kind: 'apiKey', id: apiKeyId },
        subjectUserId: userId,
        data: { before: expect.objectContaining({ id: apiKeyId, clientId }) },
        projectIds: [projectId, projectIdB],
      },
      undefined
    );
  });

  it('publishes after a hard delete too, since the pivots cascade away', async () => {
    const { service, apiKeyRepository, events } = buildDelete([userId]);

    await service.deleteApiKey({ id: apiKeyId, hardDelete: true });

    expect(apiKeyRepository.hardDeleteApiKey).toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'api_key.deleted', projectIds: [projectId, projectIdB] }),
      undefined
    );
  });

  it.each([
    ['an account or organization project key (no owning user)', []],
    ['a key with two owning users', [userId, otherUserId]],
  ])('names no subject user for %s', async (_label, owners) => {
    const { service, events } = buildDelete(owners);

    await service.deleteApiKey({ id: apiKeyId });

    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'api_key.deleted', subjectUserId: null }),
      undefined
    );
  });

  it('publishes nothing for a missing key', async () => {
    const { service, events } = buildService({ getApiKey: vi.fn().mockResolvedValue(null) });

    await expect(service.deleteApiKey({ id: apiKeyId })).rejects.toThrow(/ApiKey/);
    expect(events.publish).not.toHaveBeenCalled();
  });
});

describe('API-key event owner (subjectUserId and projectIds)', () => {
  const projectIdB = '10000000-0000-4000-8000-000000000007';
  const otherUserId = '10000000-0000-4000-8000-000000000008';

  const ownerCases: Array<[string, string[], string | null]> = [
    ['exactly one owning user', [userId], userId],
    ['an account or organization project key (no owning user)', [], null],
    ['a key with two owning users', [userId, otherUserId], null],
  ];

  describe('api_key.revoked', () => {
    function buildRevoke(owningUserIds: string[]) {
      const existing = apiKey({ name: 'Prod key' });
      const built = buildService({
        getApiKey: vi.fn().mockResolvedValue(existing),
        getOwningUserIds: vi.fn().mockResolvedValue(owningUserIds),
        revokeApiKey: vi.fn().mockResolvedValue({
          ...existing,
          isRevoked: true,
          revokedAt: new Date('2026-01-02T00:00:00.000Z'),
          revokedBy: createdBy,
        }),
      });
      vi.mocked(built.events.resolveLinkedProjectIds).mockResolvedValue([projectId, projectIdB]);
      return built;
    }

    it.each(ownerCases)('names the subject user for %s', async (_label, owners, subject) => {
      const { service, events } = buildRevoke(owners);

      await service.revokeApiKey({ id: apiKeyId });

      expect(events.resolveLinkedProjectIds).toHaveBeenCalledWith(
        [{ kind: 'apiKey', id: apiKeyId }],
        undefined
      );
      expect(events.publish).toHaveBeenCalledWith(
        {
          type: 'api_key.revoked',
          aggregate: { kind: 'apiKey', id: apiKeyId },
          subjectUserId: subject,
          data: {
            before: expect.objectContaining({ id: apiKeyId, isRevoked: false }),
            after: expect.objectContaining({ id: apiKeyId, isRevoked: true }),
          },
          projectIds: [projectId, projectIdB],
        },
        undefined
      );
    });
  });

  describe('api_key.rotated', () => {
    it.each(ownerCases)('names the subject user for %s', async (_label, owners, subject) => {
      const existing = apiKey({ name: 'Prod key' });
      const { service, events } = buildService({
        getApiKey: vi.fn().mockResolvedValue(existing),
        getOwningUserIds: vi.fn().mockResolvedValue(owners),
        updateClientSecretHash: vi.fn().mockResolvedValue(existing),
      });
      vi.mocked(events.resolveLinkedProjectIds).mockResolvedValue([projectId, projectIdB]);

      await service.rotateApiKey({ id: apiKeyId });

      expect(events.publish).toHaveBeenCalledWith(
        {
          type: 'api_key.rotated',
          aggregate: { kind: 'apiKey', id: apiKeyId },
          subjectUserId: subject,
          data: {
            before: expect.objectContaining({ id: apiKeyId, clientId }),
            after: expect.objectContaining({ id: apiKeyId, clientId }),
          },
          projectIds: [projectId, projectIdB],
        },
        undefined
      );
    });

    it('publishes nothing for a revoked key, and reads no owner', async () => {
      const { service, apiKeyRepository, events } = buildService({
        getApiKey: vi.fn().mockResolvedValue(apiKey({ isRevoked: true })),
      });

      await expect(service.rotateApiKey({ id: apiKeyId })).rejects.toThrow();

      expect(apiKeyRepository.getOwningUserIds).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });

  describe('api_key.created', () => {
    it('names the owning user and project when the caller passes an owner', async () => {
      const { service, apiKeyRepository, events } = buildService();
      const tx = { __tx: true };

      await service.createApiKey({ name: 'Prod key', owner: { projectId, userId } }, tx as never);

      expect(events.publish).toHaveBeenCalledWith(
        {
          type: 'api_key.created',
          aggregate: { kind: 'apiKey', id: expect.any(String) },
          subjectUserId: userId,
          data: { after: expect.objectContaining({ clientId: expect.any(String) }) },
          projectIds: [projectId],
        },
        tx
      );
      // `owner` decides the event only: the key row is created from the other fields.
      expect(apiKeyRepository.createApiKey).toHaveBeenCalledWith(
        expect.not.objectContaining({ owner: expect.anything() }),
        tx
      );
    });

    it('publishes neither field without an owner (account and organization-project keys)', async () => {
      const { service, events } = buildService();

      await service.createApiKey({ name: 'Prod key' });

      const [event] = vi.mocked(events.publish).mock.calls[0];
      expect(event).toMatchObject({ type: 'api_key.created' });
      expect(event).not.toHaveProperty('subjectUserId');
      expect(event).not.toHaveProperty('projectIds');
    });

    it('rejects an owner that is not a pair of ids, before anything is written', async () => {
      const { service, apiKeyRepository, events } = buildService();

      await expect(
        service.createApiKey({ owner: { projectId, userId: 'not-an-id' } } as never)
      ).rejects.toThrow();

      expect(apiKeyRepository.createApiKey).not.toHaveBeenCalled();
      expect(events.publish).not.toHaveBeenCalled();
    });
  });
});
