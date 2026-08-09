import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookDeliveryAttempt,
  WebhookDeliveryPage,
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';

export interface ListWebhookSubscriptionsParams {
  scope: Scope;
  projectId: string;
}

export interface ListWebhookDeliveriesParams {
  scope: Scope;
  projectId: string;
  subscriptionId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * Manages per-project webhook subscriptions and surfaces their delivery
 * attempts. Secrets are generated server-side and only returned at creation /
 * secret rotation.
 */
export interface IWebhookSubscriptionService {
  list(
    params: ListWebhookSubscriptionsParams,
    transaction?: unknown
  ): Promise<WebhookSubscription[]>;

  getById(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: unknown
  ): Promise<WebhookSubscription>;

  create(
    params: { scope: Scope; projectId: string; input: CreateWebhookSubscriptionInput },
    transaction?: unknown
  ): Promise<WebhookSubscriptionWithSecret>;

  update(
    params: {
      scope: Scope;
      projectId: string;
      id: string;
      input: UpdateWebhookSubscriptionInput;
    },
    transaction?: unknown
  ): Promise<WebhookSubscription>;

  rotateSecret(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: unknown
  ): Promise<WebhookSubscriptionWithSecret>;

  delete(
    params: { scope: Scope; projectId: string; id: string },
    transaction?: unknown
  ): Promise<void>;

  listDeliveries(
    params: ListWebhookDeliveriesParams,
    transaction?: unknown
  ): Promise<WebhookDeliveryPage>;

  replayDelivery(
    params: { scope: Scope; projectId: string; deliveryId: string },
    transaction?: unknown
  ): Promise<WebhookDeliveryAttempt>;
}
