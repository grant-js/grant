import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RoleSearch() {
  const t = useTranslations('roles');

  // Use selective subscription to prevent unnecessary re-renders
  const search = useRolesStore((state) => state.search);
  const setSearch = useRolesStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
