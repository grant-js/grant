import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface GroupPermissionSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function GroupPermissionSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: GroupPermissionSearchProps) {
  const t = useTranslations('group.permissions');

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
