'use client';

import { TagSelector } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectTagSelector() {
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useProjectsStore((state) => state.setSelectedTagIds);

  return <TagSelector selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
