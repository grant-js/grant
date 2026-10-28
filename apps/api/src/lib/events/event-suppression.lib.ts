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

/**
 * Run `fn` with publishing switched back on inside a suppressed subtree. For the few
 * events a CDM import must still emit because a downstream consumer relies on them
 * (`project.user_password_set`, so a mirror can tell an import's echo from an operator
 * write). Outside a suppressed subtree it changes nothing.
 */
export function runWithEventSuppressionLifted<T>(fn: () => Promise<T>): Promise<T> {
  return eventSuppressionAls.run({ suppress: false }, fn);
}
