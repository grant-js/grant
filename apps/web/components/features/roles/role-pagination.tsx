import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useRolesStore } from '@/stores/roles.store';

export function RolePagination() {
  return <Pagination {...usePaginationProps(useRolesStore)} />;
}
