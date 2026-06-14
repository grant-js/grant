import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface GroupTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function GroupTagSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: GroupTagSearchProps) {
  const t = useTranslations('group.tags');

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
