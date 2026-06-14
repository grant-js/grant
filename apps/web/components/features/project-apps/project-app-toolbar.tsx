'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { LayoutGrid } from 'lucide-react';

import { EntityCreateNavigateButton, RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppsStore } from '@/stores/project-apps.store';

import { ProjectAppLimit } from './project-app-limit';
import { ProjectAppSearch } from './project-app-search';
import { ProjectAppSorter } from './project-app-sorter';
import { ProjectAppTagSelector } from './project-app-tag-selector';
import { ProjectAppViewSwitcher } from './project-app-view-switcher';

export function ProjectAppToolbar() {
  const t = useTranslations('projectApps.createDialog');
  const scope = useScopeFromParams();
  const refetch = useProjectAppsStore((state) => state.refetch);
  const loading = useProjectAppsStore((state) => state.loading);

  const canCreate = useGrant(ResourceSlug.ProjectApp, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <ProjectAppSearch key="search" />,
    <ProjectAppSorter key="sorter" />,
    <ProjectAppTagSelector key="tags" />,
    <ProjectAppLimit key="limit" />,
    <ProjectAppViewSwitcher key="view" />,
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="apps"
            label={t('trigger')}
            icon={LayoutGrid}
          />,
        ]
      : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
