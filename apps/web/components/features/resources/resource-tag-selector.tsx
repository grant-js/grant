'use client';

import { TagSelector } from '@/components/common';
import { useResourcesStore } from '@/stores/resources.store';

export function ResourceTagSelector() {
  const selectedTagIds = useResourcesStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useResourcesStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
