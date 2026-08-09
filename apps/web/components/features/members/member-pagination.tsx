import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useMembersStore } from '@/stores/members.store';

export function MemberPagination() {
  return <Pagination {...usePaginationProps(useMembersStore)} />;
}
