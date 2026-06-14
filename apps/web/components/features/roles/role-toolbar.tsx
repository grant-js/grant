'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ShieldPlus } from 'lucide-react';

import { EntityCreateNavigateButton, RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRolesStore } from '@/stores/roles.store';

import { RoleLimit } from './role-limit';
import { RoleSearch } from './role-search';
import { RoleSorter } from './role-sorter';
import { RoleTagSelector } from './role-tag-selector';
import { RoleViewSwitcher } from './role-view-switcher';

export function RoleToolbar() {
  const t = useTranslations('roles.createDialog');
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
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="roles"
            label={t('trigger')}
            icon={ShieldPlus}
          />,
        ]
      : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
