'use client';

import { Tags } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectTagSelector() {
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);
  const setSelectedTagIds = useProjectsStore((state) => state.setSelectedTagIds);

  return <Tags selectedTagIds={selectedTagIds} onTagIdsChange={setSelectedTagIds} />;
}
