import type { Scope } from '../generated/schema-types';
import type { EventCategory, EventType } from './event-catalog';

/**
 * Payload carried inside an event. The internal model can be rich; the external
 * webhook envelope projects `data` through a redaction allowlist.
 */
export interface EventData {
  /** Snapshot of the entity after the change (redacted on external delivery). */
  after?: Record<string, unknown> | null;
  /** Snapshot before the change (optional). */
  before?: Record<string, unknown> | null;
  /** Changed-fields delta: field -> { from, to }. */
  delta?: Record<string, { from: unknown; to: unknown }> | null;
}

/** Reference to the aggregate (entity) the event is about. */
export interface EventAggregateRef {
  kind: string;
  id: string;
}

/**
 * Input accepted by `IEventPublisher.publish`. The publisher fills in id,
 * sequence, and persistence concerns.
 */
export interface DomainEventInput {
  type: EventType;
  /** Optional explicit scope; when omitted the publisher derives it from the request auth context. */
  scope?: Scope;
  actor?: { userId: string } | null;
  subjectUserId?: string | null;
  aggregate?: EventAggregateRef;
  data: EventData;
  occurredAt?: Date;
  /**
   * Projects this event is relevant to beyond the one named by its scope. The
   * publisher adds the projects an entity-bound aggregate is linked to; a caller
   * passes it only to capture the links before a write that destroys them (a
   * delete). Never part of the external envelope.
   */
  projectIds?: string[];
}

/**
 * The internal event as persisted to `event_log` and read by in-process
 * consumers (notification generator). Carries the full (unredacted) payload.
 */
export interface DomainEvent {
  id: string;
  sequence: number;
  type: EventType;
  category: EventCategory;
  deliveryClass: 'transactional' | 'notification';
  scope: Scope;
  actorUserId: string | null;
  subjectUserId: string | null;
  aggregate?: EventAggregateRef;
  data: EventData;
  occurredAt: Date;
  /**
   * Projects the event is relevant to in addition to the project its scope names
   * (webhook fan-out, ADR 0012). Internal: not carried by the webhook envelope.
   */
  projectIds?: string[];
}

/**
 * External event envelope delivered to webhook consumers. CloudEvents 1.0 core
 * fields plus Grant extension attributes (prefixed `grant`). `data` is the
 * redacted projection of the internal payload.
 */
export interface CloudEventEnvelope {
  specversion: '1.0';
  id: string;
  source: string;
  type: EventType;
  time: string;
  subject?: string;
  grantsequence: string;
  grantscope: { tenant: string; id: string };
  grantactor?: { userId: string } | null;
  /**
   * The user the event is about, when it has one (`user.role_revoked`,
   * `project.user_removed`, `organization.invitation_sent`, ...). `null` when
   * the event has no subject user. Needed because the internal `before`
   * snapshot is dropped from external `data`, so revoke/remove events would
   * otherwise not say whose access changed.
   */
  grantsubjectuser?: { userId: string } | null;
  grantcategory: EventCategory;
  data: EventData;
}
