import {
  type DbSchema,
  eventLog,
  type NewNotificationModel,
  type NotificationModel,
  notifications,
  type NotificationStatus,
} from '@grantjs/database';
import { and, count, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

export interface NotificationWithScope extends NotificationModel {
  scopeTenant: string | null;
  scopeId: string | null;
}

export interface NotificationResultUpdate {
  status: NotificationStatus;
  attemptCount: number;
  nextRetryAt: Date | null;
  errorDetails: Record<string, unknown> | null;
}

export class NotificationRepository {
  constructor(private readonly db: DbSchema) {}

  /** Idempotent insert for one (event, recipient, channel). No-op on conflict. */
  public async upsert(values: NewNotificationModel, transaction?: Transaction): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .insert(notifications)
      .values(values)
      .onConflictDoNothing({
        target: [notifications.eventId, notifications.recipientUserId, notifications.channel],
      });
  }

  public async listForRecipient(
    recipientUserId: string,
    options: { unreadOnly?: boolean; offset: number; limit: number },
    transaction?: Transaction
  ): Promise<{ rows: NotificationWithScope[]; totalCount: number }> {
    const dbInstance = transaction ?? this.db;
    const conditions = [
      eq(notifications.recipientUserId, recipientUserId),
      eq(notifications.channel, 'in_app'),
    ];
    if (options.unreadOnly) {
      conditions.push(isNull(notifications.readAt));
    }
    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      dbInstance
        .select({
          id: notifications.id,
          eventId: notifications.eventId,
          recipientUserId: notifications.recipientUserId,
          category: notifications.category,
          type: notifications.type,
          channel: notifications.channel,
          title: notifications.title,
          body: notifications.body,
          refEntity: notifications.refEntity,
          refId: notifications.refId,
          status: notifications.status,
          seenAt: notifications.seenAt,
          readAt: notifications.readAt,
          attemptCount: notifications.attemptCount,
          nextRetryAt: notifications.nextRetryAt,
          errorDetails: notifications.errorDetails,
          createdAt: notifications.createdAt,
          updatedAt: notifications.updatedAt,
          scopeTenant: eventLog.scopeTenant,
          scopeId: eventLog.scopeId,
        })
        .from(notifications)
        .leftJoin(eventLog, eq(notifications.eventId, eventLog.id))
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .offset(options.offset)
        .limit(options.limit + 1),
      dbInstance.select({ value: count() }).from(notifications).where(whereClause),
    ]);

    const hasExtra = rows.length > options.limit;
    return {
      rows: hasExtra ? rows.slice(0, options.limit) : rows,
      totalCount: countRows[0]?.value ?? 0,
    };
  }

  public async unreadCount(recipientUserId: string, transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          eq(notifications.channel, 'in_app'),
          isNull(notifications.readAt)
        )
      );
    return rows[0]?.value ?? 0;
  }

  public async markRead(
    recipientUserId: string,
    id: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const rows = await dbInstance
      .update(notifications)
      .set({ readAt: now, seenAt: now, updatedAt: now })
      .where(and(eq(notifications.id, id), eq(notifications.recipientUserId, recipientUserId)))
      .returning({ id: notifications.id });
    return rows.length > 0;
  }

  public async markAllRead(recipientUserId: string, transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const now = new Date();
    const rows = await dbInstance
      .update(notifications)
      .set({ readAt: now, seenAt: now, updatedAt: now })
      .where(
        and(
          eq(notifications.recipientUserId, recipientUserId),
          eq(notifications.channel, 'in_app'),
          isNull(notifications.readAt)
        )
      )
      .returning({ id: notifications.id });
    return rows.length;
  }

  /** Claim due email notifications (pending/failed with elapsed retry). */
  public async claimDueEmail(
    limit: number,
    now: Date,
    transaction: Transaction
  ): Promise<NotificationModel[]> {
    const rows = await transaction
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.channel, 'email'),
          inArray(notifications.status, ['pending', 'failed']),
          or(isNull(notifications.nextRetryAt), lte(notifications.nextRetryAt, now))
        )
      )
      .orderBy(notifications.createdAt)
      .limit(limit)
      .for('update', { skipLocked: true });

    if (rows.length > 0) {
      await transaction
        .update(notifications)
        .set({ status: 'pending', updatedAt: new Date() })
        .where(
          inArray(
            notifications.id,
            rows.map((r) => r.id)
          )
        );
    }
    return rows;
  }

  public async updateResult(
    id: string,
    update: NotificationResultUpdate,
    transaction?: Transaction
  ): Promise<void> {
    const dbInstance = transaction ?? this.db;
    await dbInstance
      .update(notifications)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(notifications.id, id));
  }

  public async countForRecipient(
    recipientUserId: string,
    transaction?: Transaction
  ): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ value: sql<number>`count(*)::int` })
      .from(notifications)
      .where(eq(notifications.recipientUserId, recipientUserId));
    return rows[0]?.value ?? 0;
  }
}
