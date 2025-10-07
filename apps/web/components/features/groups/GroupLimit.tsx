'use client';

import { Limit } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupLimit() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const limit = useGroupsStore((state) => state.limit);
  const setLimit = useGroupsStore((state) => state.setLimit);

  return (
    <Limit limit={limit} onLimitChange={setLimit} namespace="groups" translationKey="limit.label" />
  );
}
