import { AsyncLocalStorage } from 'node:async_hooks';

interface EventSuppressionStore {
  suppress: boolean;
}

const eventSuppressionAls = new AsyncLocalStorage<EventSuppressionStore>();

/**
 * Run `fn` with domain-event publishing suppressed for the async subtree.
 * Used by CDM import so entity mutations do not flood the outbox.
 */
export function runWithEventSuppression<T>(fn: () => Promise<T>): Promise<T> {
  return eventSuppressionAls.run({ suppress: true }, fn);
}

export function isEventPublishingSuppressed(): boolean {
  return eventSuppressionAls.getStore()?.suppress === true;
}
