import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useTagsStore } from '@/stores/tags.store';

export function TagPagination() {
  return <Pagination {...usePaginationProps(useTagsStore)} />;
}
