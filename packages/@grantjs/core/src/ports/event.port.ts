import type { DomainEvent, DomainEventInput } from '@grantjs/schema';

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
