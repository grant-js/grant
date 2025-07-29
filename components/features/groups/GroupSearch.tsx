'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface GroupSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function GroupSearch({ search, onSearchChange }: GroupSearchProps) {
  const t = useTranslations('groups');

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
