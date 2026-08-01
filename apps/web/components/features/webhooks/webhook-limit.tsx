'use client';

import { Limit } from '@/components/common';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookLimit() {
  const limit = useWebhooksStore((state) => state.limit);
  const setLimit = useWebhooksStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="webhooks"
      translationKey="limit.label"
      options={[10, 25, 50, 100]}
    />
  );
}
