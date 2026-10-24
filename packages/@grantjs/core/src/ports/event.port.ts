import type { DomainEvent, DomainEventInput, EventAggregateRef } from '@grantjs/schema';

/**
 * Port for publishing domain events to the transactional outbox.
 *
 * Implementations write the event to `event_log` using the provided
 * transaction, so the event commits atomically with the data change and audit
 * log. The transaction type is intentionally `unknown` to avoid coupling core
 * to a specific ORM (mirrors `IAuditLogger`).
 */
export interface IEventPublisher {
  publish(event: DomainEventInput, transaction?: unknown): Promise<void>;

  /**
   * Write many outbox rows in the same transaction. Empty input is a no-op.
   * Callers still pass one event per affected subject — this only batches
   * the insert, it does not drop or collapse events.
   */
  publishMany(events: DomainEventInput[], transaction?: unknown): Promise<void>;

  /**
   * Ids of the projects the given entities (role, group, permission, resource,
   * apiKey, tag) are currently linked to, or, for a `user`, the projects the user
   * is a member of. A caller that is about to destroy the links
   * (an entity delete) reads them first and passes the result as
   * `DomainEventInput.projectIds`, because by the time `publish` runs they are gone.
   */
  resolveLinkedProjectIds(refs: EventAggregateRef[], transaction?: unknown): Promise<string[]>;
}

/**
 * A consumer of domain events. Each consumer (webhooks, notifications) processes
 * events independently so failures isolate. Processing must be idempotent: the
 * same event may be presented more than once (at-least-once delivery).
 */
export interface IEventConsumer {
  /** Stable consumer identifier (used for per-consumer progress/diagnostics). */
  readonly name: string;
  /** Fan out a single event into this consumer's durable work items. */
  process(event: DomainEvent, transaction?: unknown): Promise<void>;
}
