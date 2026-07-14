'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookSearch() {
  const t = useTranslations('webhooks');
  const search = useWebhooksStore((state) => state.search);
  const setSearch = useWebhooksStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} grow />
  );
}
