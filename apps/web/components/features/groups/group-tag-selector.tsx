'use client';

import { TagSelector } from '@/components/common';
import { useGroupsStore } from '@/stores/groups.store';

export function GroupTagSelector() {
  const selectedTagIds = useGroupsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useGroupsStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
