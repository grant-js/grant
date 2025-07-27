'use client';

import { useState, useCallback, useEffect } from 'react';
import { User, UserSortableField, UserSortOrder } from '@/graphql/generated/types';
import { useUsers, useUserMutations } from '@/hooks/users';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';

interface UsersContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: UserSortableField;
    order: UserSortOrder;
  };
  onTotalCountChange?: (totalCount: number) => void;
  children: (props: {
    limit: number;
    users: User[];
    loading: boolean;
    search: string;
    onEditClick: (user: User) => void;
    onDeleteClick: (user: User) => void;
  }) => React.ReactNode;
}

export function UsersContainer({
  page,
  limit,
  search,
  sort,
  onTotalCountChange,
  children,
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
      {children({
        limit,
        users,
        loading,
        search,
        onEditClick: handleEditClick,
        onDeleteClick: handleDeleteClick,
      })}

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
