'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionSearch() {
  const t = useTranslations('permissions');

  // Use selective subscription to prevent unnecessary re-renders
  const search = usePermissionsStore((state) => state.search);
  const setSearch = usePermissionsStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
