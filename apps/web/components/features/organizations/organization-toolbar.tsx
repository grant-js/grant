'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { RefreshButton, Toolbar } from '@/components/common';
import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationCreateDialog } from './organization-create-dialog';
import { OrganizationLimit } from './organization-limit';
import { OrganizationSearch } from './organization-search';
import { OrganizationSorter } from './organization-sorter';
import { OrganizationViewSwitcher } from './organization-view-switcher';

export function OrganizationToolbar() {
  const refetch = useOrganizationsStore((state) => state.refetch);
  const loading = useOrganizationsStore((state) => state.loading);
  const scope = useAccountScope();

  const canCreate = useGrant(ResourceSlug.Organization, ResourceAction.Create, {
    scope: scope!,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <OrganizationSearch key="search" />,
    <OrganizationSorter key="sorter" />,
    <OrganizationLimit key="limit" />,
    <OrganizationViewSwitcher key="view" />,
    ...(canCreate ? [<OrganizationCreateDialog key="create" />] : []),
  ];

  return <Toolbar items={toolbarItems} />;
}
