import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function OrganizationPagination() {
  return <Pagination {...usePaginationProps(useOrganizationsStore)} />;
}
