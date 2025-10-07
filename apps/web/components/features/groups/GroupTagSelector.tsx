'use client';

import { Tags } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupTagSelector() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const selectedTagIds = useGroupsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useGroupsStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
