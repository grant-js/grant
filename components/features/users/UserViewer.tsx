'use client';

import { useEffect } from 'react';

import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useUsers } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { UserCards } from './UserCards';
import { UserTable } from './UserTable';
import { UserView } from './UserViewSwitcher';

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

  const { users, loading, totalCount } = useUsers({
    scope: scope!,
    page,
    limit,
    search,
    sort,
    tagIds: selectedTagIds,
  });

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

  switch (view) {
    case UserView.CARD:
      return <UserCards />;
    case UserView.TABLE:
    default:
      return <UserTable />;
  }
}
