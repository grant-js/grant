import type { IEventConsumer, IEventRelayService } from '@grantjs/core';

import { mapEventLogToDomainEvent } from '@/lib/events';
import { createLogger } from '@/lib/logger';
import type { Transaction } from '@/lib/transaction-manager.lib';
import type { EventLogRepository } from '@/repositories/event-log.repository';

const logger = createLogger('EventRelayService');

/**
 * Reads claimed events from the outbox and fans them out to each registered
 * consumer (webhooks, notifications). Each consumer processes independently and
 * idempotently; a consumer failure aborts the batch transaction so the events
 * stay `pending` and are retried (at-least-once).
 */
export class EventRelayService implements IEventRelayService<Transaction> {
  constructor(
    private readonly eventLogRepository: EventLogRepository,
    private readonly consumers: readonly IEventConsumer[]
  ) {}

  /**
   * Claim and dispatch one batch within the given transaction. Returns the
   * number of events processed (0 means the outbox is drained).
   */
  async relayBatch(transaction: Transaction, limit: number): Promise<number> {
    const rows = await this.eventLogRepository.claimPendingBatch(limit, transaction);
    if (rows.length === 0) return 0;

    for (const row of rows) {
      const event = mapEventLogToDomainEvent(row);
      for (const consumer of this.consumers) {
        await consumer.process(event, transaction);
      }
    }

    await this.eventLogRepository.markDispatched(
      rows.map((r) => r.id),
      transaction
    );

    logger.debug({
      msg: 'Relayed event batch',
      count: rows.length,
      consumers: this.consumers.length,
    });

    return rows.length;
  }
}
