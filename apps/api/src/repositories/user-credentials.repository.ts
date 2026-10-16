import type {
  CredentialRecord,
  CredentialSource,
  CredentialWithHash,
  CredentialWriteInput,
  ICredentialRepository,
  PlatformCredentialScope,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { userCredentials } from '@grantjs/database';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

import { withCredentialStorageErrors } from './credential-repository.lib';

/** Every column except the hash: what a write returns and what a listing shows. */
const recordColumns = {
  id: userCredentials.id,
  userId: userCredentials.userId,
  source: userCredentials.source,
  lastUsedAt: userCredentials.lastUsedAt,
  createdAt: userCredentials.createdAt,
  updatedAt: userCredentials.updatedAt,
};

type RecordRow = {
  id: string;
  userId: string;
  source: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toRecord(row: RecordRow): CredentialRecord {
  return {
    id: row.id,
    scope: 'platform',
    projectId: null,
    userId: row.userId,
    source: row.source as CredentialSource,
    lastUsedAt: row.lastUsedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Platform-scope credentials (`user_credentials`, ADR 0011 § 2). No RLS: the table is a
 * core table reached through the user. It never reads or writes `project_user_credentials`.
 */
export class UserCredentialRepository implements ICredentialRepository<PlatformCredentialScope> {
  constructor(private readonly db: DbSchema) {}

  async findActive(
    _scope: PlatformCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialWithHash | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select({ ...recordColumns, hash: userCredentials.hash })
      .from(userCredentials)
      .where(and(eq(userCredentials.userId, userId), isNull(userCredentials.deletedAt)))
      .limit(1);
    return row ? { ...toRecord(row), hash: row.hash } : null;
  }

  async lockActive(
    _scope: PlatformCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialWithHash | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select({ ...recordColumns, hash: userCredentials.hash })
      .from(userCredentials)
      .where(and(eq(userCredentials.userId, userId), isNull(userCredentials.deletedAt)))
      .limit(1)
      .for('update');
    return row ? { ...toRecord(row), hash: row.hash } : null;
  }

  async upsert(
    _scope: PlatformCredentialScope,
    input: CredentialWriteInput,
    transaction?: Transaction
  ): Promise<CredentialRecord> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    return withCredentialStorageErrors(async () => {
      const [row] = await dbInstance
        .insert(userCredentials)
        .values({
          userId: input.userId,
          hash: input.hash,
          source: input.source,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userCredentials.userId,
          targetWhere: isNull(userCredentials.deletedAt),
          set: { hash: input.hash, source: input.source, lastUsedAt: null, updatedAt: now },
        })
        .returning(recordColumns);
      return toRecord(row);
    });
  }

  async touchLastUsed(
    _scope: PlatformCredentialScope,
    userId: string,
    at: Date,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .update(userCredentials)
      .set({ lastUsedAt: at })
      .where(and(eq(userCredentials.userId, userId), isNull(userCredentials.deletedAt)));
  }

  async softDelete(
    _scope: PlatformCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord | null> {
    const [row] = await this.softDeleteAllForUserRows(userId, transaction);
    return row ?? null;
  }

  async softDeleteAllForUser(
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord[]> {
    return this.softDeleteAllForUserRows(userId, transaction);
  }

  async listActiveForUser(userId: string, transaction?: Transaction): Promise<CredentialRecord[]> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select(recordColumns)
      .from(userCredentials)
      .where(and(eq(userCredentials.userId, userId), isNull(userCredentials.deletedAt)));
    return rows.map(toRecord);
  }

  async purgeSoftDeleted(transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .delete(userCredentials)
      .where(isNotNull(userCredentials.deletedAt))
      .returning({ id: userCredentials.id });
    return rows.length;
  }

  private async softDeleteAllForUserRows(
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialRecord[]> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const rows = await dbInstance
      .update(userCredentials)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(userCredentials.userId, userId), isNull(userCredentials.deletedAt)))
      .returning(recordColumns);
    return rows.map(toRecord);
  }
}
