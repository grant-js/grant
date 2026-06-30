import { useCallback, useEffect, useState } from 'react';
import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookSubscription,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';

import {
  createWebhookSubscription,
  deleteWebhookSubscription,
  listWebhookSubscriptions,
  rotateWebhookSecret,
  updateWebhookSubscription,
} from '@/lib/webhooks-api.lib';

interface UseWebhookSubscriptionsResult {
  subscriptions: WebhookSubscription[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  create: (input: CreateWebhookSubscriptionInput) => Promise<WebhookSubscriptionWithSecret>;
  update: (id: string, input: UpdateWebhookSubscriptionInput) => Promise<WebhookSubscription>;
  rotateSecret: (id: string) => Promise<WebhookSubscriptionWithSecret>;
  remove: (id: string) => Promise<void>;
}

export function useWebhookSubscriptions(
  scope: Scope | null | undefined
): UseWebhookSubscriptionsResult {
  const [subscriptions, setSubscriptions] = useState<WebhookSubscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!scope?.id || !scope.tenant) return;
    setLoading(true);
    setError(null);
    try {
      setSubscriptions(await listWebhookSubscriptions(scope));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (input: CreateWebhookSubscriptionInput) => {
      if (!scope) throw new Error('Scope is required');
      const result = await createWebhookSubscription(scope, input);
      await refetch();
      return result;
    },
    [scope, refetch]
  );

  const update = useCallback(
    async (id: string, input: UpdateWebhookSubscriptionInput) => {
      if (!scope) throw new Error('Scope is required');
      const result = await updateWebhookSubscription(scope, id, input);
      await refetch();
      return result;
    },
    [scope, refetch]
  );

  const rotateSecret = useCallback(
    async (id: string) => {
      if (!scope) throw new Error('Scope is required');
      const result = await rotateWebhookSecret(scope, id);
      await refetch();
      return result;
    },
    [scope, refetch]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!scope) throw new Error('Scope is required');
      await deleteWebhookSubscription(scope, id);
      await refetch();
    },
    [scope, refetch]
  );

  return { subscriptions, loading, error, refetch, create, update, rotateSecret, remove };
}
