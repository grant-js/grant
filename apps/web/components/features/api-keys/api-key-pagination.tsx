'use client';

import { Pagination } from '@/components/common';
import { useUserStore } from '@/stores/user.store';

export function ApiKeyPagination() {
  const page = useUserStore((state) => state.apiKeysPage);
  const limit = useUserStore((state) => state.apiKeysLimit);
  const totalCount = useUserStore((state) => state.apiKeysTotalCount);
  const setPage = useUserStore((state) => state.setApiKeysPage);
  const totalPages = Math.ceil(totalCount / limit);

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
