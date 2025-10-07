import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserSearch() {
  const t = useTranslations('users');

  // Use selective subscription to prevent unnecessary re-renders
  const search = useUsersStore((state) => state.search);
  const setSearch = useUsersStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
