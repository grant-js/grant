'use client';

import { useEffect } from 'react';

import { useParams } from 'next/navigation';

import { ProjectSortableField, SortOrder } from '@grantjs/schema';

import { useProjectScope } from '@/hooks/common';
import { useProjects } from '@/hooks/projects';
import { useProjectsStore } from '@/stores/projects.store';

/**
 * Keeps projectsStore.currentProject in sync with the URL when on a project page.
 * Mounted in the main layout (always visible) so the breadcrumb and other consumers
 * have the project name even when the sidebar is collapsed (e.g. on mobile) and
 * ProjectSwitcher is unmounted.
 */
export function CurrentProjectSync() {
  const params = useParams();
  const scope = useProjectScope();
  const projectId = params?.projectId as string | undefined;
  const setCurrentProject = useProjectsStore((state) => state.setCurrentProject);

  const { projects } = useProjects({
    scope: scope ?? undefined,
    ids: projectId ? [projectId] : [],
    limit: 1,
    sort: { field: ProjectSortableField.Name, order: SortOrder.Asc },
    skip: !scope || !projectId,
  });

  const project = projectId ? projects[0] ?? null : null;

  useEffect(() => {
    setCurrentProject(project);
    return () => {
      setCurrentProject(null);
    };
  }, [project, setCurrentProject]);

  return null;
}
