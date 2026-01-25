'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectsStore } from '@/stores/projects.store';

import { ProjectCreateDialog } from './project-create-dialog';
import { ProjectLimit } from './project-limit';
import { ProjectSearch } from './project-search';
import { ProjectSorter } from './project-sorter';
import { ProjectTagSelector } from './project-tag-selector';
import { ProjectViewSwitcher } from './project-view-switcher';

export function ProjectToolbar() {
  const refetch = useProjectsStore((state) => state.refetch);
  const loading = useProjectsStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Project, ResourceAction.Create, {
    scope: scope!,
  });

  return (
    <Toolbar
      items={[
        <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
        <ProjectSearch key="search" />,
        <ProjectSorter key="sorter" />,
        <ProjectTagSelector key="tagSelector" />,
        <ProjectLimit key="limit" />,
        <ProjectViewSwitcher key="viewSwitcher" />,
        ...(canCreate ? [<ProjectCreateDialog key="create" />] : []),
      ]}
    />
  );
}
