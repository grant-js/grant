import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface UserApiKeySearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
}

export function UserApiKeySearch({ search, onSearchChange, show = true }: UserApiKeySearchProps) {
  const t = useTranslations('user.apiKeys');

  if (!show) {
    return null;
  }

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
