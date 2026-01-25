import { Pagination } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourcePagination() {
  const page = useResourcesStore((state) => state.page);
  const limit = useResourcesStore((state) => state.limit);
  const totalCount = useResourcesStore((state) => state.totalCount);
  const setPage = useResourcesStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
