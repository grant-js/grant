'use client';

import { useEffect } from 'react';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useProjects } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectCards } from './ProjectCards';
import { ProjectTable } from './ProjectTable';
import { ProjectView } from './ProjectViewSwitcher';

export function ProjectViewer() {
  const scope = useScopeFromParams();

  const view = useProjectsStore((state) => state.view);
  const page = useProjectsStore((state) => state.page);
  const limit = useProjectsStore((state) => state.limit);
  const search = useProjectsStore((state) => state.search);
  const sort = useProjectsStore((state) => state.sort);
  const selectedTagIds = useProjectsStore((state) => state.selectedTagIds);
  const setTotalCount = useProjectsStore((state) => state.setTotalCount);
  const setProjects = useProjectsStore((state) => state.setProjects);
  const setLoading = useProjectsStore((state) => state.setLoading);

  const { projects, loading, totalCount } = useProjects({
    scope,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  useEffect(() => {
    setProjects(projects);
  }, [projects, setProjects]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  switch (view) {
    case ProjectView.CARD:
      return <ProjectCards organizationId={scope.id} />;
    case ProjectView.TABLE:
      return <ProjectTable organizationId={scope.id} />;
    default:
      return <ProjectCards organizationId={scope.id} />;
  }
}
