import { Pagination } from '@/components/common';
import { useMembersStore } from '@/stores/members.store';

export function MemberPagination() {
  const page = useMembersStore((state) => state.page);
  const limit = useMembersStore((state) => state.limit);
  const totalCount = useMembersStore((state) => state.totalCount);
  const setPage = useMembersStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
