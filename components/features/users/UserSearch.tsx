import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface UserSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function UserSearch({ search, onSearchChange }: UserSearchProps) {
  const t = useTranslations('users');

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
