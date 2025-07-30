'use client';

import { Pagination } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupPagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = useGroupsStore((state) => state.page);
  const limit = useGroupsStore((state) => state.limit);
  const totalCount = useGroupsStore((state) => state.totalCount);
  const setPage = useGroupsStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
