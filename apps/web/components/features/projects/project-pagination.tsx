'use client';

import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectPagination() {
  return <Pagination {...usePaginationProps(useProjectsStore)} />;
}
