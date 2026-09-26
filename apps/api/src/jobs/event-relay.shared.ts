import type { ILogger } from '@grantjs/core';

import { config } from '@/config';
import { trackProjectedDomainEvents } from '@/lib/analytics';
import { DrizzleTransactionalConnection } from '@/lib/transaction-manager.lib';
import type { AppContext } from '@/types';

/**
 * Drain the event outbox: repeatedly claim + dispatch batches (each in its own
 * transaction so row locks release between batches) until the log is empty or
 * the per-run batch cap is reached. Runs under the connection's owner role, so
 * RLS is bypassed and all tenants' pending events are visible.
 */
export async function drainEventRelay(appContext: AppContext, logger: ILogger): Promise<number> {
  const { batchSize, maxBatches } = config.jobs.eventRelay;
  const txConn = new DrizzleTransactionalConnection(appContext.db);

  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const batch = await txConn.withTransaction((tx) =>
      appContext.services.eventRelay.relayBatch(tx, batchSize)
    );
    total += batch.count;

    if (batch.events.length > 0) {
      try {
        await trackProjectedDomainEvents(batch.events);
      } catch (err: unknown) {
        logger.error({ msg: 'Analytics projection failed', err });
      }
    }

    if (batch.count < batchSize) break;
  }

  if (total > 0) {
    logger.info({ msg: 'Event relay drained pending events', relayed: total });
  }
  return total;
}
