import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationSearch() {
  const t = useTranslations('organizations');

  // Use selective subscription to prevent unnecessary re-renders
  const search = useOrganizationsStore((state) => state.search);
  const setSearch = useOrganizationsStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
