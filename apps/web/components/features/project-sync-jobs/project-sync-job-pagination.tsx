'use client';

import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useProjectSyncJobsStore } from '@/stores/project-sync-jobs.store';

export function ProjectSyncJobPagination() {
  return <Pagination {...usePaginationProps(useProjectSyncJobsStore)} />;
}
