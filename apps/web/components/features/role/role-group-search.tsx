import { useTranslations } from 'next-intl';

import { Search } from '@/components/common';

interface RoleGroupSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function RoleGroupSearch({
  search,
  onSearchChange,
  show = true,
  forceCompact = false,
  grow = false,
}: RoleGroupSearchProps) {
  const t = useTranslations('role.groups');

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
