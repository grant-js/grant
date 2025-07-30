'use client';

import { useEffect } from 'react';

import { useRoles } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

import { RoleCards } from './RoleCards';
import { RoleTable } from './RoleTable';
import { RoleView } from './RoleViewSwitcher';

export function RoleViewer() {
  // Use selective subscriptions to prevent unnecessary re-renders
  const view = useRolesStore((state) => state.view);
  const page = useRolesStore((state) => state.page);
  const limit = useRolesStore((state) => state.limit);
  const search = useRolesStore((state) => state.search);
  const sort = useRolesStore((state) => state.sort);
  const selectedTagIds = useRolesStore((state) => state.selectedTagIds);
  const setTotalCount = useRolesStore((state) => state.setTotalCount);
  const setRoles = useRolesStore((state) => state.setRoles);
  const setLoading = useRolesStore((state) => state.setLoading);

  // Get roles data from the hook
  const { roles, loading, totalCount } = useRoles({
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

  // Update store with data when it changes
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

  switch (view) {
    case RoleView.CARD:
      return <RoleCards />;
    case RoleView.TABLE:
    default:
      return <RoleTable />;
  }
}
