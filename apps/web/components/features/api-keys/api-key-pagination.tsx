'use client';

import { Pagination } from '@/components/common';
import { usePaginationProps } from '@/hooks';
import { useApiKeysStore } from '@/stores/api-keys.store';

export function ApiKeyPagination() {
  return <Pagination {...usePaginationProps(useApiKeysStore)} />;
}
