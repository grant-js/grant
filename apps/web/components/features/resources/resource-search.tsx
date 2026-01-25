import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourceSearch() {
  const t = useTranslations('resources');

  // Use selective subscription to prevent unnecessary re-renders
  const search = useResourcesStore((state) => state.search);
  const setSearch = useResourcesStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
