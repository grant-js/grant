import type {
  ClaimedProjectPasswordReset,
  IProjectPasswordResetRepository,
  IssueProjectPasswordResetParams,
} from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import { projectPasswordResets } from '@grantjs/database';
import { and, eq, type SQL, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * A Date as a `timestamp` (without time zone) parameter, the way the column mapper writes
 * it: a bare `Date` inside a `sql` template is not serialised by the driver, and one that
 * were would be compared through the session time zone.
 */
function timestamp(value: Date): SQL {
  return sql`${value.toISOString()}::timestamp`;
}

/**
 * Reset tokens of the project apps (`project_password_resets`, ADR 0011 § 6). Every query
 * names the project, so the table's RLS policy is defence in depth, not the only guard.
 * Only digests of tokens ever reach this class.
 */
export class ProjectPasswordResetRepository implements IProjectPasswordResetRepository {
  constructor(private readonly db: DbSchema) {}

  async issue(
    params: IssueProjectPasswordResetParams,
    transaction?: Transaction
  ): Promise<boolean> {
    const dbInstance = transaction ?? this.db;
    const { projectId, userId, authMethodId, tokenHash, expiresAt, now, limit } = params;
    const t = projectPasswordResets;

    const windowCutoff = timestamp(new Date(now.getTime() - limit.windowMs));
    const lapsed: SQL = sql`(${t.windowStartedAt} < ${windowCutoff})`;
    const withinBudget: SQL = sql`(${lapsed} OR ${t.requestCount} < ${limit.maxRequests})`;
    const whenIssued = (next: SQL, current: SQL): SQL =>
      sql`(CASE WHEN ${withinBudget} THEN ${next} ELSE ${current} END)`;

    // One statement, so concurrent requests cannot both spend the same budget slot: the
    // conflict clause runs under the row lock and sees the committed count.
    const [row] = await dbInstance
      .insert(t)
      .values({
        projectId,
        userId,
        authMethodId,
        tokenHash,
        expiresAt,
        requestCount: 1,
        windowStartedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [t.projectId, t.userId],
        set: {
          authMethodId: whenIssued(sql`excluded.auth_method_id`, sql`${t.authMethodId}`),
          tokenHash: whenIssued(sql`excluded.token_hash`, sql`${t.tokenHash}`),
          expiresAt: whenIssued(sql`excluded.expires_at`, sql`${t.expiresAt}`),
          consumedAt: whenIssued(sql`NULL`, sql`${t.consumedAt}`),
          requestCount: sql`(CASE WHEN ${lapsed} THEN 1 WHEN ${withinBudget} THEN ${t.requestCount} + 1 ELSE ${t.requestCount} END)`,
          windowStartedAt: sql`(CASE WHEN ${lapsed} THEN ${timestamp(now)} ELSE ${t.windowStartedAt} END)`,
          updatedAt: now,
        },
      })
      .returning({ tokenHash: t.tokenHash });

    return row?.tokenHash === tokenHash;
  }

  async claimByTokenHash(
    projectId: string,
    tokenHash: string,
    transaction?: Transaction
  ): Promise<ClaimedProjectPasswordReset | null> {
    const dbInstance = transaction ?? this.db;
    const t = projectPasswordResets;
    const [row] = await dbInstance
      .select({
        id: t.id,
        userId: t.userId,
        authMethodId: t.authMethodId,
        tokenHash: t.tokenHash,
        expiresAt: t.expiresAt,
      })
      .from(t)
      .where(and(eq(t.projectId, projectId), eq(t.tokenHash, tokenHash)))
      .limit(1)
      .for('update');
    if (!row || row.tokenHash === null) {
      return null;
    }
    return { ...row, tokenHash: row.tokenHash };
  }

  async consume(id: string, now: Date, transaction?: Transaction): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .update(projectPasswordResets)
      .set({ tokenHash: null, consumedAt: now, updatedAt: now })
      .where(eq(projectPasswordResets.id, id));
  }
}
