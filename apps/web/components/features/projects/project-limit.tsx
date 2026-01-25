'use client';

import { Limit } from '@/components/common';
import { useProjectsStore } from '@/stores/projects.store';

export function ProjectLimit() {
  const limit = useProjectsStore((state) => state.limit);
  const setLimit = useProjectsStore((state) => state.setLimit);

  return <Limit limit={limit} onLimitChange={setLimit} namespace="projects" />;
}
