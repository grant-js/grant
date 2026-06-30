import type { EventType } from '../events/event-catalog';

export const WEBHOOK_ORDERING_MODES = ['best_effort', 'strict'] as const;
export type WebhookOrderingMode = (typeof WEBHOOK_ORDERING_MODES)[number];

export const WEBHOOK_DELIVERY_STATUSES = [
  'pending',
  'running',
  'delivered',
  'failed',
  'dead',
] as const;
export type WebhookDeliveryStatus = (typeof WEBHOOK_DELIVERY_STATUSES)[number];

/** Public representation of a webhook subscription (never includes the secret). */
export interface WebhookSubscription {
  id: string;
  projectId: string;
  url: string;
  eventTypes: string[];
  orderingMode: WebhookOrderingMode;
  active: boolean;
  description: string | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Returned exactly once on creation/secret-rotation; carries the plaintext secret. */
export interface WebhookSubscriptionWithSecret extends WebhookSubscription {
  secret: string;
}

export interface CreateWebhookSubscriptionInput {
  url: string;
  eventTypes: EventType[];
  orderingMode?: WebhookOrderingMode;
  description?: string | null;
  active?: boolean;
}

export interface UpdateWebhookSubscriptionInput {
  url?: string;
  eventTypes?: EventType[];
  orderingMode?: WebhookOrderingMode;
  description?: string | null;
  active?: boolean;
}

export interface WebhookDeliveryAttempt {
  id: string;
  eventId: string;
  subscriptionId: string;
  status: WebhookDeliveryStatus;
  attemptCount: number;
  nextRetryAt: Date | null;
  lastResponseStatus: number | null;
  errorDetails: Record<string, unknown> | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
