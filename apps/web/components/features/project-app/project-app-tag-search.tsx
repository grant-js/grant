import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface ProjectAppTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function ProjectAppTagSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: ProjectAppTagSearchProps) {
  const t = useTranslations('projectApp.tags');

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
