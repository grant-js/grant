import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface ApiKeyScopeSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  grow?: boolean;
}

export function ApiKeyScopeSearch({
  search,
  onSearchChange,
  grow = false,
}: ApiKeyScopeSearchProps) {
  const t = useTranslations('user.apiKeys.scopes');

  return (
    <Search
      search={search}
      onSearchChange={onSearchChange}
      placeholder={t('search.placeholder')}
      grow={grow}
    />
  );
}
