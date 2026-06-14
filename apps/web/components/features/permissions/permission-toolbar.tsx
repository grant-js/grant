'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { CopyCheck } from 'lucide-react';

import { EntityCreateNavigateButton, RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionLimit } from './permission-limit';
import { PermissionSearch } from './permission-search';
import { PermissionSorter } from './permission-sorter';
import { PermissionTagSelector } from './permission-tag-selector';
import { PermissionViewSwitcher } from './permission-view-switcher';

export function PermissionToolbar() {
  const t = useTranslations('permissions.createDialog');
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
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="permissions"
            label={t('trigger')}
            icon={CopyCheck}
          />,
        ]
      : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
