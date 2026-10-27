import type { IApiKeyRepository, IAuditLogger, IEventPublisher } from '@grantjs/core';
import { type ApiKey, Tenant } from '@grantjs/schema';
import { describe, expect, it, vi } from 'vitest';

import { ConflictError } from '@/lib/errors';
import { hashSecret, verifySecret } from '@/lib/token.lib';
import { ApiKeyService } from '@/services/api-keys.service';

const projectId = '10000000-0000-4000-8000-000000000001';
const userId = '10000000-0000-4000-8000-000000000002';
const accountId = '10000000-0000-4000-8000-000000000003';
const clientId = '10000000-0000-4000-8000-000000000004';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const createdBy = '10000000-0000-4000-8000-000000000006';
const clientSecret = 's'.repeat(32);
const clientSecretHash = hashSecret(clientSecret);
const tx = { __tx: true, execute: vi.fn() } as never;

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
    getClientSecretHash: vi.fn(),
    getOwningUserIds: vi.fn().mockResolvedValue([]),
    createApiKey: vi.fn(),
    createApiKeys: vi.fn().mockImplementation(async (rows: Array<{ clientId: string }>) =>
      rows.map((row, index) =>
        apiKey({
          id: `10000000-0000-4000-8000-00000000000${index}`,
          clientId: row.clientId,
        })
      )
    ),
    updateLastUsedAt: vi.fn(),
    updateClientSecretHash: vi.fn(),
    getApiKeys: vi.fn().mockResolvedValue({ apiKeys: [] }),
    getApiKey: vi.fn(),
    revokeApiKey: vi.fn(),
    softDeleteApiKey: vi.fn(),
    hardDeleteApiKey: vi.fn(),
    hardDeleteApiKeys: vi.fn(),
    ...repositoryOverrides,
  } satisfies IApiKeyRepository;

  const audit = {
    logCreate: vi.fn(),
    logUpdate: vi.fn(),
    logSoftDelete: vi.fn(),
    logHardDelete: vi.fn(),
  };

  const service = new ApiKeyService(
    {
      getFirstByProjectId: vi.fn().mockResolvedValue({ accountId, projectId }),
    } as never,
    {
      getFirstByProjectId: vi.fn().mockResolvedValue(null),
    } as never,
    apiKeyRepository,
    null,
    audit as unknown as IAuditLogger,
    { signApiKeyToken: vi.fn() } as never,
    { publish: vi.fn(), resolveLinkedProjectIds: vi.fn() } as unknown as IEventPublisher
  );

  return { service, apiKeyRepository, audit };
}

describe('ApiKeyService.createApiKeysForCdmImport', () => {
  it('persists the supplied hash and never audits the plaintext secret', async () => {
    const { service, apiKeyRepository, audit } = buildService();

    const created = await service.createApiKeysForCdmImport(
      {
        keys: [
          {
            clientSecretHash,
            clientId,
            scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
            name: 'Bot',
          },
        ],
      },
      tx
    );

    expect(created).toHaveLength(1);
    expect(apiKeyRepository.createApiKeys).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          clientId,
          clientSecretHash,
          name: 'Bot',
        }),
      ],
      tx
    );
    expect(verifySecret(clientSecret, clientSecretHash)).toBe(true);
    expect(JSON.stringify(audit.logCreate.mock.calls)).not.toContain(clientSecret);
    expect(JSON.stringify(audit.logCreate.mock.calls)).not.toContain(clientSecretHash);
  });

  it('fails closed when the same scoped client id is already present', async () => {
    const scopedTx = { execute: vi.fn(), __tx: true } as never;
    const { service, apiKeyRepository } = buildService({
      findActiveProjectUserApiKeysByClientId: vi.fn().mockResolvedValue([apiKey()]),
    });

    await expect(
      service.createApiKeysForCdmImport(
        {
          keys: [
            {
              clientSecretHash,
              clientId,
              scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
            },
          ],
        },
        scopedTx
      )
    ).rejects.toBeInstanceOf(ConflictError);
    expect(apiKeyRepository.createApiKeys).not.toHaveBeenCalled();
  });

  it('fails closed when the same client id appears twice in one batch', async () => {
    const { service, apiKeyRepository } = buildService();

    await expect(
      service.createApiKeysForCdmImport(
        {
          keys: [
            {
              clientSecretHash,
              clientId,
              scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
            },
            {
              clientSecretHash,
              clientId,
              scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
            },
          ],
        },
        tx
      )
    ).rejects.toBeInstanceOf(ConflictError);
    expect(apiKeyRepository.createApiKeys).not.toHaveBeenCalled();
  });
});

describe('ApiKeyService.deleteApiKeysForCdmImport', () => {
  it('audits then hard-deletes every requested id in one repository call', async () => {
    const ids = ['10000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000007'];
    const { service, apiKeyRepository, audit } = buildService({
      getApiKeys: vi.fn().mockResolvedValue({
        apiKeys: ids.map((id) => apiKey({ id })),
      }),
    });

    await service.deleteApiKeysForCdmImport({ ids }, tx);

    expect(apiKeyRepository.hardDeleteApiKeys).toHaveBeenCalledWith(ids, tx);
    expect(audit.logHardDelete).toHaveBeenCalledTimes(2);
  });
});
