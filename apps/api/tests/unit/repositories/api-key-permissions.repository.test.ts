/**
 * The permissions table of a key is written through inserts that ignore a repeat, removed by
 * setting `deleted_at`, and every statement names the key.
 */
import { apiKeyPermissions, type DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { ApiKeyPermissionRepository } from '@/repositories/api-key-permissions.repository';

const apiKeyId = '10000000-0000-4000-8000-000000000005';
const projectId = '20000000-0000-4000-8000-000000000042';
const [p1, p2, p3] = [
  '30000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000003',
];
const dialect = new PgDialect();

function chain(result: unknown) {
  const captured: Record<string, unknown> = {};
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const record = (name: string) =>
    vi.fn((...args: unknown[]) => {
      captured[name] = args[0];
      return builder;
    });
  for (const name of ['values', 'onConflictDoNothing', 'set', 'from', 'where']) {
    builder[name] = record(name);
  }
  builder.returning = vi.fn(async () => result);
  (builder as unknown as { then: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve);
  return { builder, captured };
}

describe('ApiKeyPermissionRepository', () => {
  it('adds each permission once, ignores a repeat and returns the ids it added', async () => {
    const { builder, captured } = chain([{ permissionId: p1 }]);
    const db = { insert: vi.fn(() => builder) } as unknown as DbSchema;

    const added = await new ApiKeyPermissionRepository(db).addForKey({
      apiKeyId,
      projectId,
      permissionIds: [p1, p2, p1],
    });

    expect(captured.values).toEqual([
      { apiKeyId, projectId, permissionId: p1 },
      { apiKeyId, projectId, permissionId: p2 },
    ]);
    expect(builder.onConflictDoNothing).toHaveBeenCalledOnce();
    expect(added).toEqual([p1]);
  });

  it('writes nothing for an empty list', async () => {
    const db = { insert: vi.fn(), update: vi.fn() } as unknown as DbSchema;
    const repository = new ApiKeyPermissionRepository(db);

    await expect(repository.addForKey({ apiKeyId, projectId, permissionIds: [] })).resolves.toEqual(
      []
    );
    await expect(repository.removeForKey({ apiKeyId, permissionIds: [] })).resolves.toEqual([]);
    expect((db as unknown as { insert: unknown }).insert).not.toHaveBeenCalled();
    expect((db as unknown as { update: unknown }).update).not.toHaveBeenCalled();
  });

  it('removes by setting deleted_at on the live rows of the key and permissions', async () => {
    const { builder, captured } = chain([{ permissionId: p2 }]);
    const db = { update: vi.fn(() => builder) } as unknown as DbSchema;

    await expect(
      new ApiKeyPermissionRepository(db).removeForKey({ apiKeyId, permissionIds: [p2] })
    ).resolves.toEqual([p2]);

    expect(Object.keys(captured.set as object)).toEqual(['deletedAt']);
    const query = dialect.sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"api_key_permissions"."api_key_id" = $1');
    expect(query.sql).toContain('"api_key_permissions"."permission_id" in ($2)');
    expect(query.sql).toContain('"api_key_permissions"."deleted_at" is null');
    expect(query.params).toEqual([apiKeyId, p2]);
  });

  it('lists the live permissions of one key', async () => {
    const { builder, captured } = chain([{ permissionId: p1 }]);
    const db = { select: vi.fn(() => builder) } as unknown as DbSchema;

    await expect(new ApiKeyPermissionRepository(db).listForKey(apiKeyId)).resolves.toEqual([
      { permissionId: p1 },
    ]);

    const query = dialect.sqlToQuery(captured.where as never);
    expect(query.sql).toContain('"api_key_permissions"."api_key_id" = $1');
    expect(query.sql).toContain('"api_key_permissions"."deleted_at" is null');
    expect(captured.from).toBe(apiKeyPermissions);
  });

  it('replaces by adding what is missing and removing what is no longer wanted', async () => {
    const repository = new ApiKeyPermissionRepository({} as DbSchema);
    vi.spyOn(repository, 'listForKey').mockResolvedValue([
      { permissionId: p1 },
      { permissionId: p2 },
    ]);
    const add = vi.spyOn(repository, 'addForKey').mockResolvedValue([p3]);
    const remove = vi.spyOn(repository, 'removeForKey').mockResolvedValue([p2]);

    const result = await repository.replaceForKey({
      apiKeyId,
      projectId,
      permissionIds: [p1, p3],
    });

    expect(add).toHaveBeenCalledWith({ apiKeyId, projectId, permissionIds: [p3] }, undefined);
    expect(remove).toHaveBeenCalledWith({ apiKeyId, permissionIds: [p2] }, undefined);
    expect(result).toEqual({ added: [p3], removed: [p2] });
  });

  it('runs inside the transaction it is given, not the pool', async () => {
    const pool = chain([]);
    const transaction = chain([]);
    const db = { select: vi.fn(() => pool.builder) } as unknown as DbSchema;
    const tx = { select: vi.fn(() => transaction.builder) };

    await new ApiKeyPermissionRepository(db).listForKey(apiKeyId, tx as never);

    expect(tx.select).toHaveBeenCalledOnce();
    expect((db as unknown as { select: unknown }).select).not.toHaveBeenCalled();
  });
});
