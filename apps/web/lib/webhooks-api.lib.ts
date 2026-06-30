import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookDeliveryAttempt,
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';

import { getApiBaseUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

function authHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().accessToken;
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}/api/webhook-subscriptions${path}`, {
    credentials: 'include',
    headers: authHeaders(),
    ...init,
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => res.statusText);
    throw new Error(bodyText || `Request failed (${res.status})`);
  }
  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

function scopeQuery(scope: Scope): string {
  return new URLSearchParams({ scopeId: scope.id, tenant: scope.tenant }).toString();
}

export function listWebhookSubscriptions(scope: Scope): Promise<WebhookSubscription[]> {
  return request<WebhookSubscription[]>(`?${scopeQuery(scope)}`);
}

export function createWebhookSubscription(
  scope: Scope,
  input: CreateWebhookSubscriptionInput
): Promise<WebhookSubscriptionWithSecret> {
  return request<WebhookSubscriptionWithSecret>('', {
    method: 'POST',
    body: JSON.stringify({ scope, ...input }),
  });
}

export function updateWebhookSubscription(
  scope: Scope,
  id: string,
  input: UpdateWebhookSubscriptionInput
): Promise<WebhookSubscription> {
  return request<WebhookSubscription>(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ scope, ...input }),
  });
}

export function rotateWebhookSecret(
  scope: Scope,
  id: string
): Promise<WebhookSubscriptionWithSecret> {
  return request<WebhookSubscriptionWithSecret>(`/${id}/rotate-secret`, {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
}

export function deleteWebhookSubscription(scope: Scope, id: string): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/${id}?${scopeQuery(scope)}`, { method: 'DELETE' });
}

export interface WebhookDeliveryPage {
  items: WebhookDeliveryAttempt[];
  totalCount: number;
  hasNextPage: boolean;
}

export function listWebhookDeliveries(
  scope: Scope,
  options?: { subscriptionId?: string; status?: string; page?: number; limit?: number }
): Promise<WebhookDeliveryPage> {
  const params = new URLSearchParams({ scopeId: scope.id, tenant: scope.tenant });
  if (options?.subscriptionId) params.set('subscriptionId', options.subscriptionId);
  if (options?.status) params.set('status', options.status);
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  return request<WebhookDeliveryPage>(`/deliveries?${params.toString()}`);
}

export function replayWebhookDelivery(
  scope: Scope,
  deliveryId: string
): Promise<WebhookDeliveryAttempt> {
  return request<WebhookDeliveryAttempt>(`/deliveries/${deliveryId}/replay`, {
    method: 'POST',
    body: JSON.stringify({ scope }),
  });
}
