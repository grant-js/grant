'use client';

import { useTranslations } from 'next-intl';
import { LayoutGrid, Table } from 'lucide-react';

import { type ViewOption, ViewSwitcher } from '@/components/common';
import type { WebhookView } from '@/components/features/webhooks/webhook-types';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookViewSwitcher() {
  const t = useTranslations('webhooks');
  const view = useWebhooksStore((state) => state.view);
  const setView = useWebhooksStore((state) => state.setView);

  const options: ViewOption[] = [
    { value: 'card', icon: LayoutGrid, label: t('view.card') },
    { value: 'table', icon: Table, label: t('view.table') },
  ];

  return (
    <ViewSwitcher
      currentView={view}
      onViewChange={(newView) => setView(newView as WebhookView)}
      options={options}
    />
  );
}
