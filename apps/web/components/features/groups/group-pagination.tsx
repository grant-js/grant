'use client';

import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupPagination() {
  return <Pagination {...usePaginationProps(useGroupsStore)} />;
}
