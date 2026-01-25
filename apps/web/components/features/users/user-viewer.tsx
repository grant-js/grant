'use client';

import { useCallback, useEffect } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { useScopeFromParams } from '@/hooks/common';
import { useUsers } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { UserCards } from './user-cards';
import { UserTable } from './user-table';
import { UserView } from './user-types';

export function UserViewer() {
  const scope = useScopeFromParams();
  const view = useUsersStore((state) => state.view);
  const page = useUsersStore((state) => state.page);
  const limit = useUsersStore((state) => state.limit);
  const search = useUsersStore((state) => state.search);
  const sort = useUsersStore((state) => state.sort);
  const selectedTagIds = useUsersStore((state) => state.selectedTagIds);
  const setTotalCount = useUsersStore((state) => state.setTotalCount);
  const setUsers = useUsersStore((state) => state.setUsers);
  const setLoading = useUsersStore((state) => state.setLoading);
  const setRefetch = useUsersStore((state) => state.setRefetch);

  const { users, loading, totalCount, refetch } = useUsers({
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
    setUsers(users);
  }, [users, setUsers]);

  useEffect(() => {
    setLoading(loading);
  }, [loading, setLoading]);

  useEffect(() => {
    if (totalCount && totalCount !== 0) {
      setTotalCount(totalCount);
    }
  }, [totalCount, setTotalCount]);

  const canQuery = useGrant(ResourceSlug.User, ResourceAction.Query, {
    scope: scope!,
  });

  if (!scope || !canQuery) {
    return null;
  }

  switch (view) {
    case UserView.CARD:
      return <UserCards />;
    case UserView.TABLE:
    default:
      return <UserTable />;
  }
}
