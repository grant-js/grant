import type { StoreApi, UseBoundStore } from 'zustand';

interface PaginationStoreState {
  page: number;
  limit: number;
  totalCount: number;
  setPage: (page: number) => void;
}

/**
 * Derives `Pagination` component props from any Zustand list store whose
 * state includes `page`/`limit`/`totalCount`/`setPage`.
 */
export function usePaginationProps<T extends PaginationStoreState>(
  useStore: UseBoundStore<StoreApi<T>>
) {
  const page = useStore((state) => state.page);
  const limit = useStore((state) => state.limit);
  const totalCount = useStore((state) => state.totalCount);
  const onPageChange = useStore((state) => state.setPage);
  const totalPages = Math.ceil(totalCount / limit);

  return { page, totalPages, onPageChange };
}
