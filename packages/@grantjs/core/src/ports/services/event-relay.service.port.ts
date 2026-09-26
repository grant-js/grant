import type { DomainEvent } from '@grantjs/schema';

/**
 * Relays committed domain events from the outbox to their consumers.
 *
 * Called by the event-relay job rather than by transport handlers: it claims a
 * batch inside the caller's transaction so a crash mid-relay redelivers rather
 * than drops.
 */
export interface EventRelayBatch {
  /** Events claimed in this batch. `0` means the outbox was empty. */
  count: number;
  /** Domain events dispatched to consumers in this batch, in claim order. */
  events: DomainEvent[];
}

export interface IEventRelayService<TTransaction = unknown> {
  /**
   * Claim and dispatch up to `limit` pending events.
   *
   * The returned events are the committed batch. Callers that project them
   * (analytics) do so after this transaction commits.
   */
  relayBatch(transaction: TTransaction, limit: number): Promise<EventRelayBatch>;
}
