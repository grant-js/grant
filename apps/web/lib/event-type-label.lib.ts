import type { EventType } from '@grantjs/schema';

/** next-intl message key under `webhooks.events` for a catalog event type. */
export function eventTypeLabelKey(type: EventType): `types.${EventType}` {
  return `types.${type}`;
}
