'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useRoles } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

import { RoleCards } from './role-cards';
import { RoleTable } from './role-table';
import { RoleView } from './role-types';

export function RoleViewer() {
  const scope = useScopeFromParams();
  const view = useRolesStore((state) => state.view);
  const page = useRolesStore((state) => state.page);
  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const sort = useRolesStore((state) => state.sort);
  const selectedTagIds = useRolesStore((state) => state.selectedTagIds);
  const setTotalCount = useRolesStore((state) => state.setTotalCount);
  const setRoles = useRolesStore((state) => state.setRoles);
  const setLoading = useRolesStore((state) => state.setLoading);
  const setRefetch = useRolesStore((state) => state.setRefetch);

  const { roles, loading, totalCount, refetch } = useRoles({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  const handleRefetch = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    setRefetch(handleRefetch);
    return () => setRefetch(null);
  }, [handleRefetch, setRefetch]);

  useEffect(() => {
    setRoles(roles);
  }, [roles, setRoles]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Role, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case RoleView.CARD:
      return <RoleCards />;
    case RoleView.TABLE:
    default:
      return <RoleTable />;
  }
}
