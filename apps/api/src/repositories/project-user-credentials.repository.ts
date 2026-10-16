import type {
  CredentialRecord,
  CredentialSource,
  CredentialWithHash,
  CredentialWriteInput,
  ICredentialRepository,
  ProjectCredentialScope,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { projectUserCredentials } from '@grantjs/database';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

import { withCredentialStorageErrors } from './credential-repository.lib';

/** Every column except the hash: what a write returns and what a listing shows. */
const recordColumns = {
  id: projectUserCredentials.id,
  projectId: projectUserCredentials.projectId,
  userId: projectUserCredentials.userId,
  source: projectUserCredentials.source,
  lastUsedAt: projectUserCredentials.lastUsedAt,
  createdAt: projectUserCredentials.createdAt,
  updatedAt: projectUserCredentials.updatedAt,
};

type RecordRow = {
  id: string;
  projectId: string;
  userId: string;
  source: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: RecordRow): CredentialRecord {
  return {
    id: row.id,
    scope: 'project',
    projectId: row.projectId,
    userId: row.userId,
    source: row.source as CredentialSource,
    lastUsedAt: row.lastUsedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Project-scope credentials (`project_user_credentials`, ADR 0011 § 2). The table carries
 * the project RLS policy of its sibling pivots; every query here also names the project,
 * so the policy is defence in depth, not the only guard. It never reads or writes
 * `user_credentials`.
 */
export class ProjectUserCredentialRepository implements ICredentialRepository<ProjectCredentialScope> {
  constructor(private readonly db: DbSchema) {}

  async findActive(
    scope: ProjectCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialWithHash | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select({ ...recordColumns, hash: projectUserCredentials.hash })
      .from(projectUserCredentials)
      .where(
        and(
          eq(projectUserCredentials.projectId, scope.projectId),
          eq(projectUserCredentials.userId, userId),
          isNull(projectUserCredentials.deletedAt)
        )
      )
      .limit(1);
    return row ? { ...toRecord(row), hash: row.hash } : null;
  }

  async lockActive(
    scope: ProjectCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialWithHash | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select({ ...recordColumns, hash: projectUserCredentials.hash })
      .from(projectUserCredentials)
      .where(
        and(
          eq(projectUserCredentials.projectId, scope.projectId),
          eq(projectUserCredentials.userId, userId),
          isNull(projectUserCredentials.deletedAt)
        )
      )
      .limit(1)
      .for('update');
    return row ? { ...toRecord(row), hash: row.hash } : null;
  }

  async upsert(
    scope: ProjectCredentialScope,
    input: CredentialWriteInput,
    transaction?: Transaction
  ): Promise<CredentialRecord> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    return withCredentialStorageErrors(async () => {
      const [row] = await dbInstance
        .insert(projectUserCredentials)
        .values({
          projectId: scope.projectId,
          userId: input.userId,
          hash: input.hash,
          source: input.source,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [projectUserCredentials.projectId, projectUserCredentials.userId],
          targetWhere: isNull(projectUserCredentials.deletedAt),
          set: { hash: input.hash, source: input.source, lastUsedAt: null, updatedAt: now },
        })
        .returning(recordColumns);
      return toRecord(row);
    });
  }

  async touchLastUsed(
    scope: ProjectCredentialScope,
    userId: string,
    at: Date,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .update(projectUserCredentials)
      .set({ lastUsedAt: at })
      .where(
        and(
          eq(projectUserCredentials.projectId, scope.projectId),
          eq(projectUserCredentials.userId, userId),
          isNull(projectUserCredentials.deletedAt)
        )
      );
  }

  async softDelete(
    scope: ProjectCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord | null> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const [row] = await dbInstance
      .update(projectUserCredentials)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(projectUserCredentials.projectId, scope.projectId),
          eq(projectUserCredentials.userId, userId),
          isNull(projectUserCredentials.deletedAt)
        )
      )
      .returning(recordColumns);
    return row ? toRecord(row) : null;
  }

  async softDeleteAllForUser(
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord[]> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const rows = await dbInstance
      .update(projectUserCredentials)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(eq(projectUserCredentials.userId, userId), isNull(projectUserCredentials.deletedAt))
      )
      .returning(recordColumns);
    return rows.map(toRecord);
  }

  async listActiveForUser(userId: string, transaction?: Transaction): Promise<CredentialRecord[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select(recordColumns)
      .from(projectUserCredentials)
      .where(
        and(eq(projectUserCredentials.userId, userId), isNull(projectUserCredentials.deletedAt))
      );
    return rows.map(toRecord);
  }

  async purgeSoftDeleted(transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .delete(projectUserCredentials)
      .where(isNotNull(projectUserCredentials.deletedAt))
      .returning({ id: projectUserCredentials.id });
    return rows.length;
  }
}
