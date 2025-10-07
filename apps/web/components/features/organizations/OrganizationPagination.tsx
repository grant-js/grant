import { Pagination } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationPagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = useOrganizationsStore((state) => state.page);
  const limit = useOrganizationsStore((state) => state.limit);
  const totalCount = useOrganizationsStore((state) => state.totalCount);
  const setPage = useOrganizationsStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
