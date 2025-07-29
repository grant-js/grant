'use client';

import { useState, useCallback, useEffect } from 'react';

import { User, UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { useUsers } from '@/hooks/users';

import { DeleteUserDialog } from './DeleteUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { UserViewer } from './UserViewer';
import { UserView } from './UserViewSwitcher';

interface UsersContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: UserSortableField;
    order: UserSortOrder;
  };
  view: UserView;
  onTotalCountChange?: (totalCount: number) => void;
}

export function UsersContainer({
  page,
  limit,
  search,
  sort,
  view,
  onTotalCountChange,
}: UsersContainerProps) {
  const { users, loading, error, totalCount, refetch } = useUsers({
    page,
    limit,
    search,
    sort,
  });

  const [userToDelete, setUserToDelete] = useState<{ id: string; name: string } | null>(null);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Update parent with total count when data changes
  useEffect(() => {
    if (totalCount) {
      onTotalCountChange?.(totalCount);
    }
  }, [totalCount, onTotalCountChange]);

  const handleEditClick = useCallback((user: User) => {
    setUserToEdit(user);
  }, []);

  const handleDeleteClick = useCallback((user: User) => {
    setUserToDelete({ id: user.id, name: user.name });
  }, []);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      <UserViewer
        limit={limit}
        users={users}
        loading={loading}
        search={search}
        view={view}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

      <DeleteUserDialog
        userToDelete={userToDelete}
        onOpenChange={() => setUserToDelete(null)}
        onSuccess={refetch}
      />

      <EditUserDialog
        user={userToEdit}
        open={!!userToEdit}
        onOpenChange={(open) => !open && setUserToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
