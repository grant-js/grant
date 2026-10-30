/**
 * The copy table is written through one upsert and read through one summary query that never
 * names a ciphertext column; every delete names the keys or the project.
 */
import { apiKeyExportableSecrets, type DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeyExportableSecretRepository } from '@/repositories/api-key-exportable-secrets.repository';
import { ProjectImportRepository } from '@/repositories/project-import.repository';
import { ProjectRepository } from '@/repositories/projects.repository';

const projectId = '20000000-0000-4000-8000-000000000042';
const userId = '30000000-0000-4000-8000-0000000000aa';
const apiKeyId = '10000000-0000-4000-8000-000000000005';
const dialect = new PgDialect();
const sealed = { encryptedSecret: 'ZW5j', secretIv: 'aXY=', secretTag: 'dGFn' };

function chain(result: unknown) {
  const captured: Record<string, unknown> = {};
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      captured[name] = args[0];
      return builder;
    });
  for (const name of [
    'values',
    'onConflictDoUpdate',
    'set',
    'from',
    'innerJoin',
    'leftJoin',
    'where',
    'orderBy',
    'limit',
  ]) {
    builder[name] = record(name);
  }
  builder.returning = vi.fn(async () => result);
  // Terminal for selects and inserts: awaiting the builder resolves the result.
  (builder as unknown as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return { builder, captured };
}

describe('ApiKeyExportableSecretRepository', () => {
  it('upserts one row per key and replaces the sealed triple in place on conflict', async () => {
    const { builder, captured } = chain(undefined);
    const db = { insert: vi.fn(() => builder) } as unknown as DbSchema;

    await new ApiKeyExportableSecretRepository(db).upsertForKey({ apiKeyId, projectId, sealed });

    expect(captured.values).toEqual({
      apiKeyId,
      projectId,
      encryptedSecret: sealed.encryptedSecret,
      secretIv: sealed.secretIv,
      secretTag: sealed.secretTag,
    });
    const conflict = captured.onConflictDoUpdate as {
      target: unknown;
      set: Record<string, unknown>;
    };
    expect(JSON.stringify(Object.keys(conflict.set).sort())).toBe(
      JSON.stringify(['encryptedSecret', 'projectId', 'secretIv', 'secretTag', 'updatedAt'])
    );
    expect(conflict.target).toBe(apiKeyExportableSecrets.apiKeyId);
  });

  it('deleteForKeys deletes by key id and counts the rows, and does nothing for an empty list', async () => {
    const { builder, captured } = chain([{ id: 'a' }, { id: 'b' }]);
    const db = { delete: vi.fn(() => builder) } as unknown as DbSchema;
    const repository = new ApiKeyExportableSecretRepository(db);

    await expect(repository.deleteForKeys([apiKeyId])).resolves.toBe(2);
    const query = dialect.sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"api_key_exportable_secrets"."api_key_id" in ($1)');
    expect(query.params).toEqual([apiKeyId]);

    (db as unknown as { delete: ReturnType<typeof vi.fn> }).delete.mockClear();
    await expect(repository.deleteForKeys([])).resolves.toBe(0);
    expect((db as unknown as { delete: ReturnType<typeof vi.fn> }).delete).not.toHaveBeenCalled();
  });

  it('deleteForProject deletes by project id and counts the rows', async () => {
    const { builder, captured } = chain([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
    const db = { delete: vi.fn(() => builder) } as unknown as DbSchema;

    await expect(
      new ApiKeyExportableSecretRepository(db).deleteForProject(projectId)
    ).resolves.toBe(3);
    const query = dialect.sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"api_key_exportable_secrets"."project_id" = $1');
    expect(query.params).toEqual([projectId]);
  });

  it('runs inside the transaction it is given, not the pool', async () => {
    const pool = chain([]);
    const transaction = chain([]);
    const poolDb = { delete: vi.fn(() => pool.builder) };
    const txDb = { delete: vi.fn(() => transaction.builder) };

    await new ApiKeyExportableSecretRepository(poolDb as never).deleteForProject(
      projectId,
      txDb as never
    );

    expect(poolDb.delete).not.toHaveBeenCalled();
    expect(txDb.delete).toHaveBeenCalledTimes(1);
  });

  describe('listCredentialSummaries', () => {
    const row = {
      apiKeyId,
      clientId: 'client-1',
      clientSecretFingerprint: null,
      updatedAt: new Date('2026-10-30T10:00:00Z'),
      hasCopy: true,
    };

    it('selects the five summary fields and no ciphertext, hash or secret column', async () => {
      const { builder } = chain([row]);
      const select = vi.fn((_fields: Record<string, unknown>) => builder);
      const db = { select } as unknown as DbSchema;

      await new ApiKeyExportableSecretRepository(db).listCredentialSummaries({ projectId, userId });

      expect(Object.keys(select.mock.calls[0][0]).sort()).toEqual([
        'apiKeyId',
        'clientId',
        'clientSecretFingerprint',
        'hasCopy',
        'updatedAt',
      ]);
    });

    it("is limited to the member's live, unrevoked keys in the project", async () => {
      const { builder, captured } = chain([row]);
      const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

      await new ApiKeyExportableSecretRepository(db).listCredentialSummaries({ projectId, userId });

      const query = dialect.sqlToQuery(captured.where as never);
      expect(query.sql).toContain('"project_user_api_keys"."project_id" = $1');
      expect(query.sql).toContain('"project_user_api_keys"."user_id" = $2');
      expect(query.sql).toContain('"project_user_api_keys"."deleted_at" is null');
      expect(query.sql).toContain('"api_keys"."deleted_at" is null');
      expect(query.sql).toContain('"api_keys"."is_revoked" = $3');
      expect(query.params).toEqual([projectId, userId, false]);
    });

    it('answers a null fingerprint for a legacy key and a boolean copy flag', async () => {
      const { builder } = chain([
        row,
        { ...row, hasCopy: false, clientSecretFingerprint: 'f'.repeat(64) },
      ]);
      const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

      const rows = await new ApiKeyExportableSecretRepository(db).listCredentialSummaries({
        projectId,
        userId,
      });

      expect(rows.map((entry) => entry.clientSecretFingerprint)).toEqual([null, 'f'.repeat(64)]);
      expect(rows.map((entry) => entry.hasCopy)).toEqual([true, false]);
    });
  });
});

describe('ProjectRepository.isExportableApiKeySecretsEnabled', () => {
  it.each([
    [true, true],
    [false, false],
  ])('answers the stored flag %s, under a share lock', async (stored, expected) => {
    const { builder, captured } = chain([{ enabled: stored }]);
    builder.for = vi.fn(async () => [{ enabled: stored }]);
    const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

    await expect(
      new ProjectRepository(db).isExportableApiKeySecretsEnabled(projectId)
    ).resolves.toBe(expected);
    const query = dialect.sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"projects"."id" = $1');
    expect(query.sql).toContain('"projects"."deleted_at" is null');
    expect(builder.for).toHaveBeenCalledWith('share');
  });

  it('is false for a project that does not exist', async () => {
    const { builder } = chain([]);
    builder.for = vi.fn(async () => []);
    const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

    await expect(
      new ProjectRepository(db).isExportableApiKeySecretsEnabled(projectId)
    ).resolves.toBe(false);
  });
});

describe('ProjectImportRepository.listCdmProjectUserApiKeysForReplace', () => {
  it('carries the stored plaintext fingerprint, null when the key has none', async () => {
    const { builder } = chain([
      {
        apiKeyId,
        userId,
        clientId: 'c1',
        clientSecretFingerprint: 'a'.repeat(64),
        metadata: { cdmImport: { externalKey: 'k1' } },
      },
      { apiKeyId: 'second', userId, clientId: 'c2', clientSecretFingerprint: null, metadata: null },
    ]);
    const select = vi.fn((_fields: Record<string, unknown>) => builder);

    const rows = await new ProjectImportRepository({
      select,
    } as unknown as DbSchema).listCdmProjectUserApiKeysForReplace(projectId);

    expect(Object.keys(select.mock.calls[0][0])).toContain('clientSecretFingerprint');
    expect(rows.map((entry) => entry.clientSecretFingerprint)).toEqual(['a'.repeat(64), null]);
  });
});
