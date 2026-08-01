'use client';

import { Pagination } from '@/components/common';
import { useWebhookDeliveriesStore } from '@/stores/webhook-deliveries.store';

export function WebhookDeliveriesPagination() {
  const page = useWebhookDeliveriesStore((state) => state.page);
  const limit = useWebhookDeliveriesStore((state) => state.limit);
  const totalCount = useWebhookDeliveriesStore((state) => state.totalCount);
  const setPage = useWebhookDeliveriesStore((state) => state.setPage);
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  if (totalCount === 0) {
    return null;
  }

  return <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />;
}
