import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface WebhookEventSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  grow?: boolean;
}

export function WebhookEventSearch({
  search,
  onSearchChange,
  grow = false,
}: WebhookEventSearchProps) {
  const t = useTranslations('webhooks.events');

  return (
    <Search
      search={search}
      onSearchChange={onSearchChange}
      placeholder={t('search.placeholder')}
      grow={grow}
    />
  );
}
