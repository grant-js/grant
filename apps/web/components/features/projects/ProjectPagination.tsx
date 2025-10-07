'use client';

import { Pagination } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectPagination() {
  const page = useProjectsStore((state) => state.page);
  const limit = useProjectsStore((state) => state.limit);
  const totalCount = useProjectsStore((state) => state.totalCount);
  const setPage = useProjectsStore((state) => state.setPage);

  const totalPages = Math.ceil(totalCount / limit);
  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
