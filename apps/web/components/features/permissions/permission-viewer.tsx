'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { usePermissions } from '@/hooks/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionCards } from './permission-cards';
import { PermissionTable } from './permission-table';
import { PermissionView } from './permission-types';

export function PermissionViewer() {
  const scope = useScopeFromParams();
  const view = usePermissionsStore((state) => state.view);
  const page = usePermissionsStore((state) => state.page);
  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const sort = usePermissionsStore((state) => state.sort);
  const selectedTagIds = usePermissionsStore((state) => state.selectedTagIds);
  const setTotalCount = usePermissionsStore((state) => state.setTotalCount);
  const setPermissions = usePermissionsStore((state) => state.setPermissions);
  const setLoading = usePermissionsStore((state) => state.setLoading);
  const setRefetch = usePermissionsStore((state) => state.setRefetch);

  const { permissions, loading, totalCount, refetch } = usePermissions({
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
    setPermissions(permissions);
  }, [permissions, setPermissions]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.Permission, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case PermissionView.CARD:
      return <PermissionCards />;
    case PermissionView.TABLE:
    default:
      return <PermissionTable />;
  }
}
