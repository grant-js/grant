'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourcesStore } from '@/stores/resources.store';

import { ResourceCreateDialog } from './resource-create-dialog';
import { ResourceLimit } from './resource-limit';
import { ResourceSearch } from './resource-search';
import { ResourceSorter } from './resource-sorter';
import { ResourceTagSelector } from './resource-tag-selector';
import { ResourceViewSwitcher } from './resource-view-switcher';

export function ResourceToolbar() {
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
    ...(canCreate ? [<ResourceCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
