import { Pagination } from '@/components/common';
import { useTagsStore } from '@/stores/tags.store';

export function TagPagination() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const page = useTagsStore((state) => state.page);
  const limit = useTagsStore((state) => state.limit);
  const totalCount = useTagsStore((state) => state.totalCount);
  const setPage = useTagsStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
