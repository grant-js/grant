import type { DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeyRepository } from '@/repositories/api-keys.repository';

const apiKeyId = '10000000-0000-4000-8000-000000000005';
const otherId = '10000000-0000-4000-8000-000000000006';
const fingerprint = 'a'.repeat(64);

describe('ApiKeyRepository client secret fingerprint', () => {
  it('writes the new hash and the fingerprint of its secret in one update (null when none is known)', async () => {
    const repository = new ApiKeyRepository({} as DbSchema);
    const update = vi
      .spyOn(
        repository as unknown as { update: (...args: unknown[]) => Promise<unknown> },
        'update'
      )
      .mockResolvedValue({ id: apiKeyId });

    await repository.updateClientSecretHash(apiKeyId, '$2b$10$hash', fingerprint);
    await repository.updateClientSecretHash(apiKeyId, '$2b$10$hash', null);

    expect(update.mock.calls[0][0]).toEqual({
      id: apiKeyId,
      input: { clientSecretHash: '$2b$10$hash', clientSecretFingerprint: fingerprint },
    });
    expect(update.mock.calls[1][0]).toEqual({
      id: apiKeyId,
      input: { clientSecretHash: '$2b$10$hash', clientSecretFingerprint: null },
    });
  });

  it('fills a fingerprint only where there is none, and does not touch updated_at', async () => {
    const wheres: unknown[] = [];
    const sets: Array<Record<string, unknown>> = [];
    const builder = {
      set: vi.fn((values: Record<string, unknown>) => {
        sets.push(values);
        return builder;
      }),
      where: vi.fn(async (condition: unknown) => void wheres.push(condition)),
    };
    const db = { update: vi.fn(() => builder) } as unknown as DbSchema;

    await new ApiKeyRepository(db).setMissingClientSecretFingerprints([
      { id: apiKeyId, clientSecretFingerprint: fingerprint },
      { id: otherId, clientSecretFingerprint: 'b'.repeat(64) },
    ]);

    expect(sets).toEqual([
      { clientSecretFingerprint: fingerprint },
      { clientSecretFingerprint: 'b'.repeat(64) },
    ]);
    const query = new PgDialect().sqlToQuery(wheres[0] as never);
    expect(query.sql).toContain('"api_keys"."id" = $1');
    expect(query.sql).toContain('"api_keys"."client_secret_fingerprint" is null');
    expect(query.params).toEqual([apiKeyId]);
  });
});
