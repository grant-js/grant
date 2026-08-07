/**
 * Relays committed domain events from the outbox to their consumers.
 *
 * Called by the event-relay job rather than by transport handlers: it claims a
 * batch inside the caller's transaction so a crash mid-relay redelivers rather
 * than drops.
 */
export interface IEventRelayService<TTransaction = unknown> {
  /**
   * Claim and dispatch up to `limit` pending events.
   *
   * @returns the number of events relayed — `0` means the outbox was empty.
   */
  relayBatch(transaction: TTransaction, limit: number): Promise<number>;
}
