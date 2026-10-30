/**
 * The one read of a copy's ciphertext, `findSealedForExport`: limited to the requested members'
 * live, unrevoked keys **in the project**, with the copy's own project column in the join, and
 * never reading a hash.
 */
import { type DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeyExportableSecretRepository } from '@/repositories/api-key-exportable-secrets.repository';

const projectId = '20000000-0000-4000-8000-000000000042';
const userA = '30000000-0000-4000-8000-0000000000aa';
const userB = '30000000-0000-4000-8000-0000000000bb';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const dialect = new PgDialect();

function chain(result: unknown) {
  const captured: Record<string, unknown[]> = {};
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const name of ['from', 'innerJoin', 'leftJoin', 'where', 'orderBy']) {
    builder[name] = vi.fn((...args: unknown[]) => {
      captured[name] = args;
      return builder;
    });
  }
  (builder as unknown as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return { builder, captured };
}

const stored = {
  userId: userA,
  apiKeyId,
  clientId: 'client-1',
  clientSecretFingerprint: 'f'.repeat(64),
  encryptedSecret: 'ZW5j',
  secretIv: 'aXY=',
  secretTag: 'dGFn',
};

describe('ApiKeyExportableSecretRepository.findSealedForExport', () => {
  it('names the project twice (the pivot and the copy join) and never selects a hash', async () => {
    const { builder, captured } = chain([stored]);
    const select = vi.fn((_fields: Record<string, unknown>) => builder);
    const db = { select } as unknown as DbSchema;

    await new ApiKeyExportableSecretRepository(db).findSealedForExport({
      projectId,
      userIds: [userA, userB],
    });

    expect(Object.keys(select.mock.calls[0][0]).sort()).toEqual([
      'apiKeyId',
      'clientId',
      'clientSecretFingerprint',
      'encryptedSecret',
      'secretIv',
      'secretTag',
      'userId',
    ]);

    const where = dialect.sqlToQuery(captured.where![0] as never);
    expect(where.sql).toContain('"project_user_api_keys"."project_id" = $1');
    expect(where.sql).toContain('"project_user_api_keys"."user_id" in ($2, $3)');
    expect(where.sql).toContain('"project_user_api_keys"."deleted_at" is null');
    expect(where.sql).toContain('"api_keys"."deleted_at" is null');
    expect(where.sql).toContain('"api_keys"."is_revoked" = $4');
    expect(where.params).toEqual([projectId, userA, userB, false]);

    // The copy is joined on the key and on the same project, so a copy of another project is
    // never opened for this export.
    const join = dialect.sqlToQuery(captured.leftJoin![1] as never);
    expect(join.sql).toContain('"api_key_exportable_secrets"."api_key_id" = "api_keys"."id"');
    expect(join.sql).toContain('"api_key_exportable_secrets"."project_id" = $1');
    expect(join.params).toEqual([projectId]);
  });

  it('answers the sealed triple for a key with a copy and null for one without', async () => {
    const { builder } = chain([
      stored,
      {
        ...stored,
        apiKeyId: 'second',
        clientSecretFingerprint: null,
        encryptedSecret: null,
        secretIv: null,
        secretTag: null,
      },
    ]);
    const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

    const rows = await new ApiKeyExportableSecretRepository(db).findSealedForExport({
      projectId,
      userIds: [userA],
    });

    expect(rows).toEqual([
      {
        userId: userA,
        apiKeyId,
        clientId: 'client-1',
        clientSecretFingerprint: 'f'.repeat(64),
        sealed: { encryptedSecret: 'ZW5j', secretIv: 'aXY=', secretTag: 'dGFn' },
      },
      {
        userId: userA,
        apiKeyId: 'second',
        clientId: 'client-1',
        clientSecretFingerprint: null,
        sealed: null,
      },
    ]);
  });

  it('reads nothing for an empty member list, and runs in the transaction it is given', async () => {
    const pool = { select: vi.fn() };
    const repository = new ApiKeyExportableSecretRepository(pool as never);

    await expect(repository.findSealedForExport({ projectId, userIds: [] })).resolves.toEqual([]);
    expect(pool.select).not.toHaveBeenCalled();

    const { builder } = chain([]);
    const tx = { select: vi.fn(() => builder) };
    await repository.findSealedForExport({ projectId, userIds: [userA] }, tx as never);
    expect(tx.select).toHaveBeenCalledTimes(1);
    expect(pool.select).not.toHaveBeenCalled();
  });
});
