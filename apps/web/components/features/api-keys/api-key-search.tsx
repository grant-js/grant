'use client';

import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

export interface ApiKeySearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
}

export function ApiKeySearch({ search, onSearchChange, show = true }: ApiKeySearchProps) {
  const t = useTranslations('user.apiKeys');

  if (!show) {
    return null;
  }

  return (
    <Search search={search} onSearchChange={onSearchChange} placeholder={t('search.placeholder')} />
  );
}
