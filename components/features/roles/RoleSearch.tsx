import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface RoleSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function RoleSearch({ search, onSearchChange }: RoleSearchProps) {
  const t = useTranslations('roles');

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
