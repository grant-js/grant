'use client';

import { Pagination } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionPagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = usePermissionsStore((state) => state.page);
  const limit = usePermissionsStore((state) => state.limit);
  const totalCount = usePermissionsStore((state) => state.totalCount);
  const setPage = usePermissionsStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
