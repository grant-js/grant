'use client';

import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionPagination() {
  return <Pagination {...usePaginationProps(usePermissionsStore)} />;
}
