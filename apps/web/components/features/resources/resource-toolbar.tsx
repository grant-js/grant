'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { PackagePlus } from 'lucide-react';

import { EntityCreateNavigateButton, RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceLimit } from './resource-limit';
import { ResourceSearch } from './resource-search';
import { ResourceSorter } from './resource-sorter';
import { ResourceTagSelector } from './resource-tag-selector';
import { ResourceViewSwitcher } from './resource-view-switcher';

export function ResourceToolbar() {
  const t = useTranslations('resources.createDialog');
  const refetch = useResourcesStore((state) => state.refetch);
  const loading = useResourcesStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Resource, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <ResourceSearch key="search" />,
    <ResourceSorter key="sorter" />,
    <ResourceTagSelector key="tags" />,
    <ResourceLimit key="limit" />,
    <ResourceViewSwitcher key="view" />,
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="resources"
            label={t('trigger')}
            icon={PackagePlus}
          />,
        ]
      : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
