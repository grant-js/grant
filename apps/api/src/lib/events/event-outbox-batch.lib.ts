import { AsyncLocalStorage } from 'node:async_hooks';

import type { NewEventLogModel } from '@grantjs/database';

type OutboxBatchFlush = (rows: NewEventLogModel[], transaction?: unknown) => Promise<void>;

interface OutboxBatchStore {
  rows: NewEventLogModel[];
  flush: OutboxBatchFlush | null;
}

const outboxBatchAls = new AsyncLocalStorage<OutboxBatchStore>();

/**
 * Collect outbox rows from `publish` in this async subtree and insert them
 * together after `fn` succeeds. Project links are still resolved at each
 * `publish` (before later cascade steps drop them).
 */
export async function runWithOutboxBatch<T>(
  transaction: unknown,
  fn: () => Promise<T>
): Promise<T> {
  const store: OutboxBatchStore = { rows: [], flush: null };
  return outboxBatchAls.run(store, async () => {
    const result = await fn();
    if (store.rows.length > 0 && store.flush) {
      await store.flush(store.rows, transaction);
    }
    return result;
  });
}

export function getActiveOutboxBatch(): OutboxBatchStore | undefined {
  return outboxBatchAls.getStore();
}
