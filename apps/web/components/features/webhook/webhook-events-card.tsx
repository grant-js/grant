'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { EventType, WebhookSubscription } from '@grantjs/schema';

import { useDebounce, useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';

import { WebhookEventTypesTable } from './webhook-event-types-table';

interface WebhookEventsCardProps {
  subscription: WebhookSubscription;
  onAfterWebhookMutation?: () => void | Promise<unknown>;
}

export function WebhookEventsCard({
  subscription,
  onAfterWebhookMutation,
}: WebhookEventsCardProps) {
  const t = useTranslations('webhooks.events');
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectGrantContext();
  const { update } = useWebhookSubscriptionMutations(scope);

  const canUpdate = useGrant(ResourceSlug.Project, ResourceAction.Update, {
    scope: scope!,
    context: projectGrantContext,
  });

  const [optimisticEventTypes, setOptimisticEventTypes] = useState<string[]>(
    subscription.eventTypes
  );
  const [updatingEventType, setUpdatingEventType] = useState<string | null>(null);
  const [refreshLoading, setRefreshLoading] = useState(false);

  useEffect(() => {
    setOptimisticEventTypes(subscription.eventTypes);
  }, [subscription.eventTypes]);

  const debouncedUpdateEvents = useDebounce(
    async (eventType: string, shouldAdd: boolean, currentEventTypes: string[]) => {
      if (!scope) {
        return;
      }

      setUpdatingEventType(eventType);
      try {
        const nextEventTypes = shouldAdd
          ? [...currentEventTypes, eventType]
          : currentEventTypes.filter((value) => value !== eventType);

        await update(subscription.id, { eventTypes: nextEventTypes as EventType[] });
        await onAfterWebhookMutation?.();
      } finally {
        setUpdatingEventType(null);
      }
    },
    300
  );

  const handleEventToggle = useCallback(
    (eventType: EventType, checked: boolean) => {
      const currentEventTypes = [...optimisticEventTypes];

      if (!checked && currentEventTypes.length <= 1) {
        return;
      }

      const nextEventTypes = checked
        ? [...currentEventTypes, eventType]
        : currentEventTypes.filter((value) => value !== eventType);

      setOptimisticEventTypes(nextEventTypes);
      debouncedUpdateEvents(eventType, checked, currentEventTypes);
    },
    [debouncedUpdateEvents, optimisticEventTypes]
  );

  const isToggleDisabled = useCallback(
    (eventType: EventType, isChecked: boolean) =>
      !canUpdate || (isChecked && optimisticEventTypes.length <= 1),
    [canUpdate, optimisticEventTypes.length]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await onAfterWebhookMutation?.();
    } finally {
      setRefreshLoading(false);
    }
  }, [onAfterWebhookMutation]);

  return (
    <WebhookEventTypesTable
      title={t('title')}
      description={t('description')}
      selectedEventTypes={optimisticEventTypes}
      onToggle={handleEventToggle}
      isToggleDisabled={isToggleDisabled}
      updatingEventType={updatingEventType}
      onRefresh={handleRefresh}
      refreshLoading={refreshLoading}
    />
  );
}
