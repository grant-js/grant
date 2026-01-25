'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupsStore } from '@/stores/groups.store';

import { GroupCreateDialog } from './group-create-dialog';
import { GroupLimit } from './group-limit';
import { GroupSearch } from './group-search';
import { GroupSorter } from './group-sorter';
import { GroupTagSelector } from './group-tag-selector';
import { GroupViewSwitcher } from './group-view-switcher';

export function GroupToolbar() {
  const refetch = useGroupsStore((state) => state.refetch);
  const loading = useGroupsStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Group, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <GroupSearch key="search" />,
    <GroupSorter key="sorter" />,
    <GroupTagSelector key="tags" />,
    <GroupLimit key="limit" />,
    <GroupViewSwitcher key="view" />,
    ...(canCreate ? [<GroupCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
