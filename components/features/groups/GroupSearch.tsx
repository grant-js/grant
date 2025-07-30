'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupSearch() {
  const t = useTranslations('groups');

  // Use selective subscription to prevent unnecessary re-renders
  const search = useGroupsStore((state) => state.search);
  const setSearch = useGroupsStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
