'use client';

import { Pagination } from '@/components/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookPagination() {
  const page = useWebhooksStore((state) => state.page);
  const limit = useWebhooksStore((state) => state.limit);
  const totalCount = useWebhooksStore((state) => state.totalCount);
  const setPage = useWebhooksStore((state) => state.setPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  if (totalCount === 0) {
    return null;
  }

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
