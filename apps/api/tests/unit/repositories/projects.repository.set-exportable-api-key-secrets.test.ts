/**
 * The opt-in write is one conditional UPDATE: the row changes only when the stored value differs,
 * so a repeated or concurrent call changes nothing and reports nothing.
 */
import type { DbSchema } from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { ProjectRepository } from '@/repositories/projects.repository';

const projectId = '20000000-0000-4000-8000-000000000042';

function fakeDb(returned: unknown[]) {
  const captured: { set?: Record<string, unknown>; where?: unknown } = {};
  const builder = {
    set: vi.fn((values: Record<string, unknown>) => {
      captured.set = values;
      return builder;
    }),
    where: vi.fn((condition: unknown) => {
      captured.where = condition;
      return builder;
    }),
    returning: vi.fn(async () => returned),
  };
  const db = { update: vi.fn(() => builder) } as unknown as DbSchema;
  return { db, captured };
}

describe('ProjectRepository.setExportableApiKeySecrets', () => {
  it.each([true, false])(
    'updates only a live project whose stored value differs from %s',
    async (enabled) => {
      const { db, captured } = fakeDb([{ id: projectId, exportableApiKeySecrets: enabled }]);

      const project = await new ProjectRepository(db).setExportableApiKeySecrets({
        projectId,
        enabled,
      });

      expect(project).toEqual({ id: projectId, exportableApiKeySecrets: enabled });
      expect(captured.set).toMatchObject({ exportableApiKeySecrets: enabled });
      const query = new PgDialect().sqlToQuery(captured.where as never);
      expect(query.sql).toContain('"projects"."id" = $1');
      expect(query.sql).toContain('"projects"."deleted_at" is null');
      expect(query.sql).toContain('"projects"."exportable_api_key_secrets" <> $2');
      expect(query.params).toEqual([projectId, enabled]);
    }
  );

  it('answers null when the conditional update matched nothing', async () => {
    const { db } = fakeDb([]);

    await expect(
      new ProjectRepository(db).setExportableApiKeySecrets({ projectId, enabled: true })
    ).resolves.toBeNull();
  });

  it('runs inside the transaction it is given, not the pool', async () => {
    const pool = fakeDb([]);
    const transaction = fakeDb([{ id: projectId }]);

    await new ProjectRepository(pool.db).setExportableApiKeySecrets(
      { projectId, enabled: true },
      transaction.db as never
    );

    expect(
      (pool.db as unknown as { update: ReturnType<typeof vi.fn> }).update
    ).not.toHaveBeenCalled();
    expect(
      (transaction.db as unknown as { update: ReturnType<typeof vi.fn> }).update
    ).toHaveBeenCalledTimes(1);
  });
});
