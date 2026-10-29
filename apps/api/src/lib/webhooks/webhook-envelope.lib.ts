import type { CloudEventEnvelope, DomainEvent } from '@grantjs/schema';

import { redactEventData, type WebhookDeliveryTarget } from './webhook-redaction.lib';

/**
 * Build the external CloudEvents 1.0 envelope for a domain event. `data` is the
 * redacted projection of the internal payload; Grant-specific attributes are
 * carried as `grant`-prefixed extension fields. `target` is the delivery's project
 * (the subscription's own `projectId`): `data.before.externalKeys` keeps only that
 * project's entries and is `[]` without one.
 */
export function buildCloudEventEnvelope(
  event: DomainEvent,
  source: string,
  target: WebhookDeliveryTarget = {}
): CloudEventEnvelope {
  return {
    specversion: '1.0',
    id: event.id,
    source,
    type: event.type,
    time: event.occurredAt.toISOString(),
    subject: event.aggregate ? `${event.aggregate.kind}/${event.aggregate.id}` : undefined,
    grantsequence: String(event.sequence),
    grantscope: { tenant: event.scope.tenant, id: event.scope.id },
    grantactor: event.actorUserId ? { userId: event.actorUserId } : null,
    grantsubjectuser: event.subjectUserId ? { userId: event.subjectUserId } : null,
    grantcategory: event.category,
    data: redactEventData(event.data, event, target),
  };
}
