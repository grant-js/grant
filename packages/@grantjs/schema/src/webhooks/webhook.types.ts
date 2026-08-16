import type { EventType } from '../events/event-catalog';

/** Service-layer create payload (scope is passed separately). */
export interface CreateWebhookSubscriptionInput {
  url: string;
  eventTypes: EventType[];
  description?: string | null;
  active?: boolean;
}

/** Service-layer update payload (scope is passed separately). */
export interface UpdateWebhookSubscriptionInput {
  url?: string;
  eventTypes?: EventType[];
  description?: string | null;
  active?: boolean;
}
