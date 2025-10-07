'use client';

import { Limit } from '@/components/common';
import { useTagsStore } from '@/stores/tags.store';

export function TagLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useTagsStore((state) => state.limit);
  const setLimit = useTagsStore((state) => state.setLimit);

  return (
    <Limit
      limit={limit}
      onLimitChange={setLimit}
      namespace="tags"
      translationKey="limit"
      options={[10, 25, 50, 100]}
    />
  );
}
