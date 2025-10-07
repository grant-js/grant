import { Pagination } from '@/components/common';
import { useRolesStore } from '@/stores/roles.store';

export function RolePagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = useRolesStore((state) => state.page);
  const limit = useRolesStore((state) => state.limit);
  const totalCount = useRolesStore((state) => state.totalCount);
  const setPage = useRolesStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
