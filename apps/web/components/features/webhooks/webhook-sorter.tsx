'use client';

import { useTranslations } from 'next-intl';

import { Sorter, type SortInput } from '@/components/common';
import {
  WebhookSortableField,
  type WebhookSortInput,
} from '@/components/features/webhooks/webhook-types';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookSorter() {
  const t = useTranslations('webhooks');
  const sort = useWebhooksStore((state) => state.sort);
  const setSort = useWebhooksStore((state) => state.setSort);

  const convertSort = (input: WebhookSortInput): SortInput<WebhookSortableField> => ({
    field: input.field,
    order: input.order,
  });

  const fields = [
    { value: WebhookSortableField.Url, label: t('sort.url') },
    { value: WebhookSortableField.CreatedAt, label: t('sort.createdAt') },
    { value: WebhookSortableField.Active, label: t('sort.active') },
  ];

  return (
    <Sorter
      sort={convertSort(sort)}
      onSortChange={(field, order) => setSort(field, order)}
      fields={fields}
      defaultField={WebhookSortableField.CreatedAt}
      translationNamespace="webhooks"
    />
  );
}
