import type {
  CredentialLockoutPolicy,
  CredentialLockoutState,
  ICredentialLockoutRepository,
  PlatformCredentialScope,
  ProjectCredentialScope,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { projectUserCredentialLockouts, userCredentialLockouts } from '@grantjs/database';
import { and, eq, type SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { Transaction } from '@/lib/transaction-manager.lib';

interface LockoutColumns {
  failedAttempts: PgColumn;
  windowStartedAt: PgColumn;
  lockedUntil: PgColumn;
}

/**
 * A Date as a `timestamp` (without time zone) parameter. A bare `Date` inside a `sql`
 * template is not serialised by the driver, and one that were would be typed
 * `timestamptz` and compared through the session time zone. The ISO string cast to
 * `timestamp` is what the column mapper writes, so these compare like stored values.
 */
function timestamp(value: Date): SQL {
  return sql`${value.toISOString()}::timestamp`;
}

/**
 * The counter update, as one statement so concurrent failures cannot lose a count (a
 * read-then-write over the cache port could, and a burst of parallel guesses would all
 * read the same count).
 *
 * A failure restarts the count when its window has lapsed or the previous lock has
 * expired. An active lock is never extended by further failures, so a guesser cannot keep
 * a victim locked out for ever.
 */
function counterUpdate(columns: LockoutColumns, policy: CredentialLockoutPolicy, nowDate: Date) {
  const now = timestamp(nowDate);
  const windowCutoff = timestamp(new Date(nowDate.getTime() - policy.windowMs));
  const lockUntil = timestamp(new Date(nowDate.getTime() + policy.lockDurationMs));
  const { failedAttempts, windowStartedAt, lockedUntil } = columns;

  const restarts: SQL = sql`(${windowStartedAt} < ${windowCutoff} OR (${lockedUntil} IS NOT NULL AND ${lockedUntil} <= ${now}))`;
  const nextCount: SQL = sql`(CASE WHEN ${restarts} THEN 1 ELSE ${failedAttempts} + 1 END)`;

  return {
    failedAttempts: nextCount,
    windowStartedAt: sql`(CASE WHEN ${restarts} THEN ${now} ELSE ${windowStartedAt} END)`,
    lockedUntil: sql`(CASE
      WHEN ${lockedUntil} IS NOT NULL AND ${lockedUntil} > ${now} THEN ${lockedUntil}
      WHEN ${nextCount} >= ${policy.maxAttempts} THEN ${lockUntil}
      ELSE NULL
    END)`,
    updatedAt: nowDate,
  };
}

function toState(row: {
  failedAttempts: number;
  lockedUntil: Date | null;
}): CredentialLockoutState {
  return { failedAttempts: row.failedAttempts, lockedUntil: row.lockedUntil ?? null };
}

function firstInsertLockedUntil(policy: CredentialLockoutPolicy, now: Date): Date | null {
  return policy.maxAttempts <= 1 ? new Date(now.getTime() + policy.lockDurationMs) : null;
}

const returned = (table: { failedAttempts: PgColumn; lockedUntil: PgColumn }) => ({
  failedAttempts: table.failedAttempts,
  lockedUntil: table.lockedUntil,
});

/** Platform-scope lockout counter (`user_credential_lockouts`). Not enabled by any caller yet. */
export class UserCredentialLockoutRepository implements ICredentialLockoutRepository<PlatformCredentialScope> {
  constructor(private readonly db: DbSchema) {}

  async recordFailure(
    _scope: PlatformCredentialScope,
    userId: string,
    policy: CredentialLockoutPolicy,
    now: Date,
    transaction?: Transaction
  ): Promise<CredentialLockoutState> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .insert(userCredentialLockouts)
      .values({
        userId,
        failedAttempts: 1,
        windowStartedAt: now,
        lockedUntil: firstInsertLockedUntil(policy, now),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userCredentialLockouts.userId,
        set: counterUpdate(userCredentialLockouts, policy, now),
      })
      .returning({
        failedAttempts: userCredentialLockouts.failedAttempts,
        lockedUntil: userCredentialLockouts.lockedUntil,
      });
    return toState(row);
  }

  async getState(
    _scope: PlatformCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialLockoutState | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select(returned(userCredentialLockouts))
      .from(userCredentialLockouts)
      .where(eq(userCredentialLockouts.userId, userId))
      .limit(1);
    return row ? toState(row) : null;
  }

  async reset(
    _scope: PlatformCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<void> {
    await this.resetAllForUser(userId, transaction);
  }

  async resetAllForUser(userId: string, transaction?: Transaction): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .delete(userCredentialLockouts)
      .where(eq(userCredentialLockouts.userId, userId));
  }
}

/** Project-scope lockout counter (`project_user_credential_lockouts`). Not enabled by any caller yet. */
export class ProjectUserCredentialLockoutRepository implements ICredentialLockoutRepository<ProjectCredentialScope> {
  constructor(private readonly db: DbSchema) {}

  async recordFailure(
    scope: ProjectCredentialScope,
    userId: string,
    policy: CredentialLockoutPolicy,
    now: Date,
    transaction?: Transaction
  ): Promise<CredentialLockoutState> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .insert(projectUserCredentialLockouts)
      .values({
        projectId: scope.projectId,
        userId,
        failedAttempts: 1,
        windowStartedAt: now,
        lockedUntil: firstInsertLockedUntil(policy, now),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [projectUserCredentialLockouts.projectId, projectUserCredentialLockouts.userId],
        set: counterUpdate(projectUserCredentialLockouts, policy, now),
      })
      .returning({
        failedAttempts: projectUserCredentialLockouts.failedAttempts,
        lockedUntil: projectUserCredentialLockouts.lockedUntil,
      });
    return toState(row);
  }

  async getState(
    scope: ProjectCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<CredentialLockoutState | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .select(returned(projectUserCredentialLockouts))
      .from(projectUserCredentialLockouts)
      .where(
        and(
          eq(projectUserCredentialLockouts.projectId, scope.projectId),
          eq(projectUserCredentialLockouts.userId, userId)
        )
      )
      .limit(1);
    return row ? toState(row) : null;
  }

  async reset(
    scope: ProjectCredentialScope,
    userId: string,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .delete(projectUserCredentialLockouts)
      .where(
        and(
          eq(projectUserCredentialLockouts.projectId, scope.projectId),
          eq(projectUserCredentialLockouts.userId, userId)
        )
      );
  }

  async resetAllForUser(userId: string, transaction?: Transaction): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .delete(projectUserCredentialLockouts)
      .where(eq(projectUserCredentialLockouts.userId, userId));
  }
}
