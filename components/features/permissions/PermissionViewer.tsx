'use client';

import { useEffect } from 'react';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePermissions } from '@/hooks/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

import { PermissionCards } from './PermissionCards';
import { PermissionTable } from './PermissionTable';
import { PermissionView } from './PermissionViewSwitcher';

export function PermissionViewer() {
  const scope = useScopeFromParams();

  // Use selective subscriptions to prevent unnecessary re-renders
  const view = usePermissionsStore((state) => state.view);
  const page = usePermissionsStore((state) => state.page);
  const limit = usePermissionsStore((state) => state.limit);
  const search = usePermissionsStore((state) => state.search);
  const sort = usePermissionsStore((state) => state.sort);
  const selectedTagIds = usePermissionsStore((state) => state.selectedTagIds);
  const setTotalCount = usePermissionsStore((state) => state.setTotalCount);
  const setPermissions = usePermissionsStore((state) => state.setPermissions);
  const setLoading = usePermissionsStore((state) => state.setLoading);

  // Get permissions data from the hook
  const { permissions, loading, totalCount } = usePermissions({
    scope,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  // Update store with data when it changes
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

  switch (view) {
    case PermissionView.CARD:
      return <PermissionCards />;
    case PermissionView.TABLE:
    default:
      return <PermissionTable />;
  }
}
