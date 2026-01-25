'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRolesStore } from '@/stores/roles.store';

import { RoleCreateDialog } from './role-create-dialog';
import { RoleLimit } from './role-limit';
import { RoleSearch } from './role-search';
import { RoleSorter } from './role-sorter';
import { RoleTagSelector } from './role-tag-selector';
import { RoleViewSwitcher } from './role-view-switcher';

export function RoleToolbar() {
  const refetch = useRolesStore((state) => state.refetch);
  const loading = useRolesStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.Role, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <RoleSearch key="search" />,
    <RoleSorter key="sorter" />,
    <RoleTagSelector key="tags" />,
    <RoleLimit key="limit" />,
    <RoleViewSwitcher key="view" />,
    ...(canCreate ? [<RoleCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
