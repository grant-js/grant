import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface UserRoleSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
}

export function UserRoleSearch({ search, onSearchChange, show = true }: UserRoleSearchProps) {
  const t = useTranslations('user.roles');

  if (!show) {
    return null;
  }

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
