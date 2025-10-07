import { Pagination } from '@/components/common';
import { useUsersStore } from '@/stores/users.store';

export function UserPagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = useUsersStore((state) => state.page);
  const limit = useUsersStore((state) => state.limit);
  const totalCount = useUsersStore((state) => state.totalCount);
  const setPage = useUsersStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
