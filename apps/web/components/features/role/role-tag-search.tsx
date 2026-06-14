import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface RoleTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function RoleTagSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: RoleTagSearchProps) {
  const t = useTranslations('role.tags');

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
