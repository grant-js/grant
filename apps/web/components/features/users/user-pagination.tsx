import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useUsersStore } from '@/stores/users.store';

export function UserPagination() {
  return <Pagination {...usePaginationProps(useUsersStore)} />;
}
