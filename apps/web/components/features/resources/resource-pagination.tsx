import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourcePagination() {
  return <Pagination {...usePaginationProps(useResourcesStore)} />;
}
