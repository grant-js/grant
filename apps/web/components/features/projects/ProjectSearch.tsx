'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectSearch() {
  const t = useTranslations('projects');
  const search = useProjectsStore((state) => state.search);
  const setSearch = useProjectsStore((state) => state.setSearch);

  return (
    <Search search={search} onSearchChange={setSearch} placeholder={t('search.placeholder')} />
  );
}
