import { type DbSchema, eventLog, type EventLogModel } from '@grantjs/database';
import { asc, eq, inArray } from 'drizzle-orm';

import { Transaction } from '@/lib/transaction-manager.lib';

/**
 * Database access for the `event_log` outbox.
 *
 * The relay claims pending rows with `FOR UPDATE SKIP LOCKED` so multiple
 * instances/workers can drain the log concurrently without contending on the
 * same rows. Claiming must happen inside a transaction.
 */
export class EventLogRepository {
  constructor(private readonly db: DbSchema) {}

  /**
   * Claim a batch of pending events, oldest first, locking them for the
   * duration of the transaction. Other concurrent claimers skip locked rows.
   */
  public async claimPendingBatch(
    limit: number,
    transaction: Transaction
  ): Promise<EventLogModel[]> {
    return transaction
      .select()
      .from(eventLog)
      .where(eq(eventLog.relayStatus, 'pending'))
      .orderBy(asc(eventLog.sequence))
      .limit(limit)
      .for('update', { skipLocked: true });
  }

  /** Mark the given events as dispatched (relay fan-out completed). */
  public async markDispatched(ids: string[], transaction: Transaction): Promise<void> {
    if (ids.length === 0) return;
    await transaction
      .update(eventLog)
      .set({ relayStatus: 'dispatched' })
      .where(inArray(eventLog.id, ids));
  }

  /** Fetch event rows by id (delivery job hydration). */
  public async getByIds(ids: string[], transaction?: Transaction): Promise<EventLogModel[]> {
    if (ids.length === 0) return [];
    const dbInstance = transaction ?? this.db;
    return dbInstance.select().from(eventLog).where(inArray(eventLog.id, ids));
  }

  /** Count rows still awaiting relay (diagnostics / tests). */
  public async countPending(transaction?: Transaction): Promise<number> {
    const dbInstance = transaction ?? this.db;
    const rows = await dbInstance
      .select({ id: eventLog.id })
      .from(eventLog)
      .where(eq(eventLog.relayStatus, 'pending'));
    return rows.length;
  }
}
