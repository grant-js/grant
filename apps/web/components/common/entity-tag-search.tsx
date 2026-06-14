'use client';

import { Search } from '@/components/common/search';

interface EntityTagSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  show?: boolean;
  forceCompact?: boolean;
  grow?: boolean;
}

export function EntityTagSearch({
  search,
  onSearchChange,
  placeholder,
  show = true,
  forceCompact = false,
  grow = false,
}: EntityTagSearchProps) {
  if (!show) {
    return null;
  }

  return (
    <Search
      search={search}
      onSearchChange={onSearchChange}
      placeholder={placeholder}
      forceCompact={forceCompact}
      grow={grow}
    />
  );
}
