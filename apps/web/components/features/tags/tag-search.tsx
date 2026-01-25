'use client';

import { Search } from '@/components/common';
import { useTagsStore } from '@/stores/tags.store';

export function TagSearch() {
  const search = useTagsStore((state) => state.search);
  const setSearch = useTagsStore((state) => state.setSearch);

  return <Search search={search} onSearchChange={setSearch} placeholder="Search tags..." />;
}
