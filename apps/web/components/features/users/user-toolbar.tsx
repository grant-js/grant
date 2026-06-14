'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { UserPlus } from 'lucide-react';

import { EntityCreateNavigateButton, RefreshButton, Toolbar } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useUsersStore } from '@/stores/users.store';

import { UserLimit } from './user-limit';
import { UserSearch } from './user-search';
import { UserSorter } from './user-sorter';
import { UserTagSelector } from './user-tag-selector';
import { UserViewSwitcher } from './user-view-switcher';

export function UserToolbar() {
  const t = useTranslations('users.createDialog');
  const refetch = useUsersStore((state) => state.refetch);
  const loading = useUsersStore((state) => state.loading);
  const scope = useScopeFromParams();

  const canCreate = useGrant(ResourceSlug.User, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <UserSearch key="search" />,
    <UserSorter key="sorter" />,
    <UserTagSelector key="tags" />,
    <UserLimit key="limit" />,
    <UserViewSwitcher key="view" />,
    ...(canCreate
      ? [
          <EntityCreateNavigateButton
            key="create"
            entitySegment="users"
            label={t('trigger')}
            icon={UserPlus}
          />,
        ]
      : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
