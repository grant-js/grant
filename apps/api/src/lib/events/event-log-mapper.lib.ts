import type { EventLogModel } from '@grantjs/database';
import {
  type DomainEvent,
  type EventAggregateRef,
  type EventCategory,
  type EventData,
  type EventType,
  Tenant,
} from '@grantjs/schema';

interface StoredPayload {
  aggregate?: EventAggregateRef | null;
  data?: EventData;
}

/** Map a persisted `event_log` row to the internal {@link DomainEvent} shape. */
export function mapEventLogToDomainEvent(row: EventLogModel): DomainEvent {
  const payload = (row.payload ?? {}) as StoredPayload;
  return {
    id: row.id,
    sequence: row.sequence,
    type: row.type as EventType,
    category: row.category as EventCategory,
    deliveryClass: row.deliveryClass,
    scope: { tenant: row.scopeTenant as Tenant, id: row.scopeId },
    actorUserId: row.actorUserId,
    subjectUserId: row.subjectUserId,
    aggregate: payload.aggregate ?? undefined,
    data: payload.data ?? {},
    occurredAt: row.occurredAt,
  };
}
