import type { ILogger } from '@grantjs/core';

import { config } from '@/config';
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
    const processed = await txConn.withTransaction((tx) =>
      appContext.services.eventRelay.relayBatch(tx, batchSize)
    );
    total += processed;
    if (processed < batchSize) break;
  }

  if (total > 0) {
    logger.info({ msg: 'Event relay drained pending events', relayed: total });
  }
  return total;
}
