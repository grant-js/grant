import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type {
  CreateWebhookSubscriptionInput,
  Scope,
  UpdateWebhookSubscriptionInput,
  WebhookSubscriptionWithSecret,
} from '@grantjs/schema';

import { toast } from '@/components/ui/toast';
import {
  createWebhookSubscription,
  deleteWebhookSubscription,
  rotateWebhookSecret,
  updateWebhookSubscription,
} from '@/lib/webhooks-api.lib';

function getUpdateSuccessMessage(
  input: UpdateWebhookSubscriptionInput,
  t: ReturnType<typeof useTranslations<'webhooks'>>,
  tEvents: ReturnType<typeof useTranslations<'webhooks.events'>>
): string {
  const keys = Object.keys(input);

  if (keys.length === 1 && keys[0] === 'active' && input.active !== undefined) {
    return input.active ? t('subscriptions.enabled') : t('subscriptions.disabled');
  }

  if (keys.length === 1 && keys[0] === 'eventTypes') {
    return tEvents('updateSuccess');
  }

  return t('subscriptions.updateSuccess');
}

export function useWebhookSubscriptionMutations(scope: Scope | null | undefined) {
  const t = useTranslations('webhooks');
  const tEvents = useTranslations('webhooks.events');

  const create = useCallback(
    async (input: CreateWebhookSubscriptionInput): Promise<WebhookSubscriptionWithSecret> => {
      if (!scope) {
        throw new Error('Scope is required');
      }
      return createWebhookSubscription(scope, input);
    },
    [scope]
  );

  const update = useCallback(
    async (id: string, input: UpdateWebhookSubscriptionInput) => {
      if (!scope) {
        throw new Error('Scope is required');
      }

      try {
        const result = await updateWebhookSubscription(scope, id, input);
        toast.success(getUpdateSuccessMessage(input, t, tEvents));
        return result;
      } catch (error) {
        toast.error(t('subscriptions.updateError'), {
          description: error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [scope, t, tEvents]
  );

  const rotateSecret = useCallback(
    async (id: string): Promise<WebhookSubscriptionWithSecret> => {
      if (!scope) {
        throw new Error('Scope is required');
      }
      return rotateWebhookSecret(scope, id);
    },
    [scope]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!scope) {
        throw new Error('Scope is required');
      }
      return deleteWebhookSubscription(scope, id);
    },
    [scope]
  );

  return { create, update, rotateSecret, remove };
}
