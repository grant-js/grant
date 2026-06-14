import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface ResourceTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function ResourceTagSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: ResourceTagSearchProps) {
  const t = useTranslations('resource.tags');

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
