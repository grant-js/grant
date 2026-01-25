'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationCards } from './organization-cards';
import { OrganizationTable } from './organization-table';
import { OrganizationView } from './organization-types';

export function OrganizationViewer() {
  const view = useOrganizationsStore((state) => state.view);
  const page = useOrganizationsStore((state) => state.page);
  const limit = useOrganizationsStore((state) => state.limit);
  const search = useOrganizationsStore((state) => state.search);
  const sort = useOrganizationsStore((state) => state.sort);
  const setTotalCount = useOrganizationsStore((state) => state.setTotalCount);
  const setOrganizations = useOrganizationsStore((state) => state.setOrganizations);
  const setLoading = useOrganizationsStore((state) => state.setLoading);
  const setRefetch = useOrganizationsStore((state) => state.setRefetch);
  const scope = useAccountScope();

  const { organizations, loading, totalCount, refetch } = useOrganizations({
    scope: scope!,
    page,
    limit,
    search,
    sort,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setOrganizations(organizations);
  }, [organizations, setOrganizations]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Organization, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case OrganizationView.CARD:
      return <OrganizationCards />;
    case OrganizationView.TABLE:
    default:
      return <OrganizationTable />;
  }
}
