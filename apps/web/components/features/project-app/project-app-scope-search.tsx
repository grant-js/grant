import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface ProjectAppScopeSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function ProjectAppScopeSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: ProjectAppScopeSearchProps) {
  const t = useTranslations('projectApp.scopes');

  if (!show) {
    return null;
  }

  return (
    <Search
      search={search}
      onSearchChange={onSearchChange}
      placeholder={t('search.placeholder')}
      forceCompact={forceCompact}
      grow={grow}
    />
  );
}
