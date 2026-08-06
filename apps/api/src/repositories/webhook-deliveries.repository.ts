import {
  type DbSchema,
  type WebhookDeliveryAttemptModel,
  webhookDeliveryAttempts,
  type WebhookDeliveryStatus,
  webhookSubscriptions,
} from '@grantjs/database';
import type {
  WebhookDeliveryAttempt,
  WebhookDeliveryStatus as GqlWebhookDeliveryStatus,
} from '@grantjs/schema';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

export function toWebhookDeliveryAttempt(row: WebhookDeliveryAttemptModel): WebhookDeliveryAttempt {
  return {
    id: row.id,
    eventId: row.eventId,
    subscriptionId: row.subscriptionId,
    status: row.status as GqlWebhookDeliveryStatus,
    attemptCount: row.attemptCount,
    nextRetryAt: row.nextRetryAt ?? null,
    lastResponseStatus: row.lastResponseStatus ?? null,
    errorDetails: (row.errorDetails as Record<string, unknown> | null) ?? null,
    deliveredAt: row.deliveredAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export interface DeliveryResultUpdate {
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextRetryAt: Date | null;
  lastResponseStatus: number | null;
  errorDetails: Record<string, unknown> | null;
  deliveredAt: Date | null;
}

export class WebhookDeliveryRepository {
  constructor(private readonly db: DbSchema) {}

  /** Idempotently create a pending delivery for (event, subscription). */
  public async upsertPending(
    eventId: string,
    subscriptionId: string,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .insert(webhookDeliveryAttempts)
      .values({ eventId, subscriptionId, status: 'pending' })
      .onConflictDoNothing({
        target: [webhookDeliveryAttempts.eventId, webhookDeliveryAttempts.subscriptionId],
      });
  }

  /**
   * Claim due deliveries (pending or failed with an elapsed retry time),
   * locking them so concurrent delivery workers do not double-send.
   */
  public async claimDue(
    limit: number,
    now: Date,
    transaction: Transaction
  ): Promise<WebhookDeliveryAttemptModel[]> {
    const rows = await transaction
      .select()
      .from(webhookDeliveryAttempts)
      .where(
        and(
          inArray(webhookDeliveryAttempts.status, ['pending', 'failed']),
          or(
            isNull(webhookDeliveryAttempts.nextRetryAt),
            lte(webhookDeliveryAttempts.nextRetryAt, now)
          )
        )
      )
      .orderBy(webhookDeliveryAttempts.createdAt)
      .limit(limit)
      .for('update', { skipLocked: true });

    if (rows.length > 0) {
      await transaction
        .update(webhookDeliveryAttempts)
        .set({ status: 'running', updatedAt: new Date() })
        .where(
          inArray(
            webhookDeliveryAttempts.id,
            rows.map((row) => row.id)
          )
        );
    }
    return rows;
  }

  public async updateResult(
    id: string,
    update: DeliveryResultUpdate,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .update(webhookDeliveryAttempts)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(webhookDeliveryAttempts.id, id));
  }

  public async getById(
    id: string,
    transaction?: Transaction
  ): Promise<WebhookDeliveryAttemptModel | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select()
      .from(webhookDeliveryAttempts)
      .where(eq(webhookDeliveryAttempts.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  /** Fetch a delivery scoped to a project (via its subscription). */
  public async getByIdForProject(
    id: string,
    projectId: string,
    transaction?: Transaction
  ): Promise<WebhookDeliveryAttemptModel | null> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ delivery: webhookDeliveryAttempts })
      .from(webhookDeliveryAttempts)
      .innerJoin(
        webhookSubscriptions,
        eq(webhookDeliveryAttempts.subscriptionId, webhookSubscriptions.id)
      )
      .where(and(eq(webhookDeliveryAttempts.id, id), eq(webhookSubscriptions.projectId, projectId)))
      .limit(1);
    return rows[0]?.delivery ?? null;
  }

  public async listForProject(
    projectId: string,
    options: { subscriptionId?: string; status?: string; offset: number; limit: number },
    transaction?: Transaction
  ): Promise<{ rows: WebhookDeliveryAttemptModel[]; totalCount: number; hasNextPage: boolean }> {
    const dbInstance = transaction ?? this.db;
    const conditions = [eq(webhookSubscriptions.projectId, projectId)];
    if (options.subscriptionId) {
      conditions.push(eq(webhookDeliveryAttempts.subscriptionId, options.subscriptionId));
    }
    if (options.status) {
      conditions.push(eq(webhookDeliveryAttempts.status, options.status as WebhookDeliveryStatus));
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      dbInstance
        .select({ delivery: webhookDeliveryAttempts })
        .from(webhookDeliveryAttempts)
        .innerJoin(
          webhookSubscriptions,
          eq(webhookDeliveryAttempts.subscriptionId, webhookSubscriptions.id)
        )
        .where(whereClause)
        .orderBy(desc(webhookDeliveryAttempts.createdAt))
        .offset(options.offset)
        .limit(options.limit + 1),
      dbInstance
        .select({ count: sql<number>`count(*)::int` })
        .from(webhookDeliveryAttempts)
        .innerJoin(
          webhookSubscriptions,
          eq(webhookDeliveryAttempts.subscriptionId, webhookSubscriptions.id)
        )
        .where(whereClause),
    ]);

    // Over-fetching one row is the authoritative next-page signal: it reflects the
    // same snapshot as the page itself, unlike comparing against a separate count(*).
    const hasNextPage = rows.length > options.limit;
    const trimmed = hasNextPage ? rows.slice(0, options.limit) : rows;
    return {
      rows: trimmed.map((row) => row.delivery),
      totalCount: countRows[0]?.count ?? 0,
      hasNextPage,
    };
  }

  /** Reset a delivery (typically a `dead`/`failed` one) for manual replay. */
  public async resetForReplay(
    id: string,
    transaction?: Transaction
  ): Promise<WebhookDeliveryAttemptModel | null> {
    const dbInstance = transaction ?? this.db;
    const [row] = await dbInstance
      .update(webhookDeliveryAttempts)
      .set({
        status: 'pending',
        nextRetryAt: new Date(),
        errorDetails: null,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveryAttempts.id, id))
      .returning();
    return row ?? null;
  }
}
