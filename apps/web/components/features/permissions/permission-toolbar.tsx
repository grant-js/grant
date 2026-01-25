'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionCreateDialog } from './permission-create-dialog';
import { PermissionLimit } from './permission-limit';
import { PermissionSearch } from './permission-search';
import { PermissionSorter } from './permission-sorter';
import { PermissionTagSelector } from './permission-tag-selector';
import { PermissionViewSwitcher } from './permission-view-switcher';

export function PermissionToolbar() {
  const refetch = usePermissionsStore((state) => state.refetch);
  const loading = usePermissionsStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Permission, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <PermissionSearch key="search" />,
    <PermissionSorter key="sorter" />,
    <PermissionTagSelector key="tags" />,
    <PermissionLimit key="limit" />,
    <PermissionViewSwitcher key="view" />,
    ...(canCreate ? [<PermissionCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
