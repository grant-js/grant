import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface UserTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  /** When true, render as icon+popover only (no full-width bar). */
  forceCompact?: boolean;
  grow?: boolean;
}

export function UserTagSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: UserTagSearchProps) {
  const t = useTranslations('user.tags');

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
