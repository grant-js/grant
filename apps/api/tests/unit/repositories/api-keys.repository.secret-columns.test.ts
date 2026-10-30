import type { DbSchema } from '@grantjs/database';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiKeyRepository, withoutSecretColumns } from '@/repositories/api-keys.repository';
import { EntityRepository } from '@/repositories/common/EntityRepository';

const apiKeyId = '10000000-0000-4000-8000-000000000005';
const clientId = '10000000-0000-4000-8000-000000000007';
const HASH = '$2b$10$secretHashSentinelsecretHashSentinelsecretHashSentinelsecr';
const FINGERPRINT = 'f'.repeat(64);

/** A whole `api_keys` row as the database returns it, secret columns included. */
const row = (overrides: Record<string, unknown> = {}) => ({
  id: apiKeyId,
  clientId,
  clientSecretHash: HASH,
  clientSecretFingerprint: FINGERPRINT,
  name: 'key',
  description: null,
  expiresAt: null,
  lastUsedAt: null,
  isRevoked: false,
  revokedAt: null,
  revokedBy: null,
  createdBy: apiKeyId,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  deletedAt: null,
  ...overrides,
});

/** What a REST client would receive: the JSON of the value, as `sendSuccessResponse` writes it. */
const wire = (value: unknown) => JSON.stringify(value);

function expectNoSecretColumns(value: unknown) {
  const json = wire(value);
  expect(json).not.toContain('clientSecretHash');
  expect(json).not.toContain('clientSecretFingerprint');
  expect(json).not.toContain(HASH);
  expect(json).not.toContain(FINGERPRINT);
}

/** A drizzle-like chain whose every step returns itself and which resolves to `rows` when awaited. */
function chain(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const step of ['select', 'from', 'innerJoin', 'where', 'values', 'returning', 'insert']) {
    builder[step] = vi.fn(() => builder);
  }
  builder.then = (resolve: (rows: unknown[]) => unknown) => resolve(rows);
  return builder;
}

describe('ApiKeyRepository never returns the secret hash or fingerprint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('withoutSecretColumns drops both columns and keeps the rest', () => {
    const stripped = withoutSecretColumns(row());
    expect(stripped).not.toHaveProperty('clientSecretHash');
    expect(stripped).not.toHaveProperty('clientSecretFingerprint');
    expect(stripped).toMatchObject({ id: apiKeyId, clientId, name: 'key', isRevoked: false });
  });

  it('does not mutate the row it is given', () => {
    const original = row();
    withoutSecretColumns(original);
    expect(original.clientSecretHash).toBe(HASH);
  });

  it('list, get and find-by-client-id (the REST list and every lookup)', async () => {
    const repository = new ApiKeyRepository({} as DbSchema);
    vi.spyOn(repository as unknown as { query: (...args: unknown[]) => Promise<unknown> }, 'query');
    vi.spyOn(
      EntityRepository.prototype as unknown as { query: (...args: unknown[]) => Promise<unknown> },
      'query'
    ).mockResolvedValue({
      items: [row(), row({ id: clientId })],
      totalCount: 2,
      hasNextPage: false,
    });

    const page = await repository.getApiKeys({ scope: undefined, page: 1, limit: 10 });
    expect(page.apiKeys).toHaveLength(2);
    expectNoSecretColumns(page);

    expectNoSecretColumns(await repository.getApiKey(apiKeyId));
    expectNoSecretColumns(await repository.findByClientId(clientId));
    const active = await repository.findActiveByClientId(clientId);
    expect(active).not.toBeNull();
    expectNoSecretColumns(active);
  });

  it('create, rotate (update), revoke, last-used, soft delete and hard delete responses', async () => {
    const repository = new ApiKeyRepository({} as DbSchema);
    const base = EntityRepository.prototype as unknown as Record<
      string,
      (...args: unknown[]) => Promise<unknown>
    >;
    for (const method of ['create', 'update', 'softDelete', 'hardDelete']) {
      vi.spyOn(base, method).mockResolvedValue(row());
    }

    expectNoSecretColumns(
      await repository.createApiKey({
        clientId,
        clientSecretHash: HASH,
        clientSecretFingerprint: FINGERPRINT,
        createdBy: apiKeyId,
      })
    );
    expectNoSecretColumns(await repository.updateClientSecretHash(apiKeyId, HASH, FINGERPRINT));
    expectNoSecretColumns(await repository.updateLastUsedAt(apiKeyId, new Date()));
    expectNoSecretColumns(await repository.revokeApiKey(apiKeyId, apiKeyId));
    expectNoSecretColumns(await repository.softDeleteApiKey(apiKeyId));
    expectNoSecretColumns(await repository.hardDeleteApiKey(apiKeyId));
  });

  it('batch create (CDM import) returns the keys without the secret columns', async () => {
    const db = chain([row(), row({ id: clientId })]);
    const repository = new ApiKeyRepository(db as unknown as DbSchema);

    const created = await repository.createApiKeys([
      {
        clientId,
        clientSecretHash: HASH,
        clientSecretFingerprint: FINGERPRINT,
        createdBy: apiKeyId,
      },
    ]);

    expect(created).toHaveLength(2);
    expectNoSecretColumns(created);
  });

  it.each([
    [
      'project user',
      'findActiveProjectUserApiKeysByClientId',
      { projectId: apiKeyId, userId: apiKeyId },
    ],
    [
      'account project',
      'findActiveAccountProjectApiKeysByClientId',
      { accountId: apiKeyId, projectId: apiKeyId },
    ],
    [
      'organization project',
      'findActiveOrganizationProjectApiKeysByClientId',
      { organizationId: apiKeyId, projectId: apiKeyId },
    ],
  ])('exchange lookup in a %s scope', async (_label, method, scope) => {
    const db = chain([{ apiKey: row() }]);
    const repository = new ApiKeyRepository(db as unknown as DbSchema);

    const keys = await (
      repository as unknown as Record<string, (params: unknown) => Promise<unknown[]>>
    )[method]({ clientId, ...scope });

    expect(keys).toHaveLength(1);
    expectNoSecretColumns(keys);
  });

  it('the hash is still readable by the one method that verifies a secret', async () => {
    const db = chain([{ clientSecretHash: HASH }]);
    (db as Record<string, unknown>).limit = vi.fn(() => db);
    const repository = new ApiKeyRepository(db as unknown as DbSchema);

    await expect(repository.getClientSecretHash(apiKeyId)).resolves.toBe(HASH);
  });
});
