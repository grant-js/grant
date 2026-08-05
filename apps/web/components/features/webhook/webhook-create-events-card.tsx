'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { EventType } from '@grantjs/schema';
import { useFormContext } from 'react-hook-form';

import type { WebhookCreateFormValues } from '@/components/features/webhooks/webhook-types';
import { FormField, FormItem, TranslatedFormMessage } from '@/components/ui/form';

import { WebhookEventTypesTable } from './webhook-event-types-table';

export function WebhookCreateEventsCard() {
  const t = useTranslations('webhooks');
  const tEvents = useTranslations('webhooks.events');
  const form = useFormContext<WebhookCreateFormValues>();
  const selectedEventTypes = form.watch('eventTypes') ?? [];

  const handleEventToggle = useCallback(
    (eventType: EventType, checked: boolean) => {
      const currentEventTypes = form.getValues('eventTypes') ?? [];
      const nextEventTypes = checked
        ? [...currentEventTypes, eventType]
        : currentEventTypes.filter((value) => value !== eventType);

      form.setValue('eventTypes', nextEventTypes, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form]
  );

  return (
    <FormField
      control={form.control}
      name="eventTypes"
      render={() => (
        <FormItem>
          <WebhookEventTypesTable
            title={tEvents('title')}
            description={t('create.eventsDescription')}
            selectedEventTypes={selectedEventTypes}
            onToggle={handleEventToggle}
          >
            <TranslatedFormMessage className="mt-3" />
          </WebhookEventTypesTable>
        </FormItem>
      )}
    />
  );
}
