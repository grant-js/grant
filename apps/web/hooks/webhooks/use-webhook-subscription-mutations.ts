import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ApolloCache } from '@apollo/client';
import { useMutation } from '@apollo/client/react';
import {
  CreateWebhookSubscriptionDocument,
  type CreateWebhookSubscriptionInput,
  type CreateWebhookSubscriptionMutation,
  DeleteWebhookSubscriptionDocument,
  type DeleteWebhookSubscriptionMutation,
  RotateWebhookSubscriptionSecretDocument,
  type RotateWebhookSubscriptionSecretMutation,
  Scope,
  UpdateWebhookSubscriptionDocument,
  type UpdateWebhookSubscriptionInput,
  type UpdateWebhookSubscriptionMutation,
  type WebhookSubscription,
  type WebhookSubscriptionWithSecret,
} from '@grantjs/schema';

import { toast } from '@/components/ui/toast';

import { evictWebhooksCache } from './cache';

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

  const updateCache = useCallback((cache: ApolloCache) => {
    evictWebhooksCache(cache);
  }, []);

  const [createMutation] = useMutation<CreateWebhookSubscriptionMutation>(
    CreateWebhookSubscriptionDocument,
    { update: updateCache }
  );

  const [updateMutation] = useMutation<UpdateWebhookSubscriptionMutation>(
    UpdateWebhookSubscriptionDocument,
    { update: updateCache }
  );

  const [rotateMutation] = useMutation<RotateWebhookSubscriptionSecretMutation>(
    RotateWebhookSubscriptionSecretDocument,
    { update: updateCache }
  );

  const [deleteMutation] = useMutation<DeleteWebhookSubscriptionMutation>(
    DeleteWebhookSubscriptionDocument,
    { update: updateCache }
  );

  const create = useCallback(
    async (input: CreateWebhookSubscriptionInput): Promise<WebhookSubscriptionWithSecret> => {
      if (!scope) {
        throw new Error('Scope is required');
      }

      const result = await createMutation({
        variables: {
          input: {
            scope,
            url: input.url,
            eventTypes: input.eventTypes,
            description: input.description,
            active: input.active,
          },
        },
      });

      const created = result.data?.createWebhookSubscription;
      if (!created) {
        throw new Error(t('subscriptions.createError'));
      }
      return created as WebhookSubscriptionWithSecret;
    },
    [scope, createMutation, t]
  );

  const update = useCallback(
    async (id: string, input: UpdateWebhookSubscriptionInput): Promise<WebhookSubscription> => {
      if (!scope) {
        throw new Error('Scope is required');
      }

      try {
        const result = await updateMutation({
          variables: {
            id,
            input: {
              scope,
              url: input.url,
              eventTypes: input.eventTypes,
              description: input.description,
              active: input.active,
            },
          },
        });

        const updated = result.data?.updateWebhookSubscription;
        if (!updated) {
          throw new Error(t('subscriptions.updateError'));
        }

        toast.success(getUpdateSuccessMessage(input, t, tEvents));
        return updated as WebhookSubscription;
      } catch (error) {
        toast.error(t('subscriptions.updateError'), {
          description: error instanceof Error ? error.message : undefined,
        });
        throw error;
      }
    },
    [scope, updateMutation, t, tEvents]
  );

  const rotateSecret = useCallback(
    async (id: string): Promise<WebhookSubscriptionWithSecret> => {
      if (!scope) {
        throw new Error('Scope is required');
      }

      const result = await rotateMutation({
        variables: {
          input: { id, scope },
        },
      });

      const rotated = result.data?.rotateWebhookSubscriptionSecret;
      if (!rotated?.secret) {
        throw new Error(t('subscriptions.rotateError'));
      }

      return rotated as WebhookSubscriptionWithSecret;
    },
    [scope, rotateMutation, t]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!scope) {
        throw new Error('Scope is required');
      }

      await deleteMutation({
        variables: {
          input: { id, scope },
        },
      });
    },
    [scope, deleteMutation]
  );

  return useMemo(
    () => ({ create, update, rotateSecret, remove }),
    [create, update, rotateSecret, remove]
  );
}
