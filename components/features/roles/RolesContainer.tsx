'use client';

import { useState, useCallback, useEffect } from 'react';
import { Role, RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';
import { useRoles, useRoleMutations } from '@/hooks/roles';
import { EditRoleDialog } from './EditRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';

interface RolesContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: RoleSortableField;
    order: RoleSortOrder;
  };
  onTotalCountChange?: (totalCount: number) => void;
  children: (props: {
    limit: number;
    roles: Role[];
    loading: boolean;
    search: string;
    onEditClick: (role: Role) => void;
    onDeleteClick: (role: Role) => void;
  }) => React.ReactNode;
}

export function RolesContainer({
  page,
  limit,
  search,
  sort,
  onTotalCountChange,
  children,
}: RolesContainerProps) {
  const { roles, loading, error, totalCount } = useRoles({
    page,
    limit,
    search,
    sort,
  });

  const [roleToDelete, setRoleToDelete] = useState<{ id: string; name: string } | null>(null);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);

  // Update parent with total count when data changes
  useEffect(() => {
    if (totalCount) {
      onTotalCountChange?.(totalCount);
    }
  }, [totalCount, onTotalCountChange]);

  const handleEditClick = useCallback((role: Role) => {
    setRoleToEdit(role);
  }, []);

  const handleDeleteClick = useCallback((role: Role) => {
    setRoleToDelete({ id: role.id, name: role.name });
  }, []);

  if (error) return <div>Error: {error.message}</div>;

  return (
    <>
      {children({
        limit,
        roles,
        loading,
        search,
        onEditClick: handleEditClick,
        onDeleteClick: handleDeleteClick,
      })}

      <DeleteRoleDialog roleToDelete={roleToDelete} onOpenChange={() => setRoleToDelete(null)} />

      <EditRoleDialog
        role={roleToEdit}
        open={!!roleToEdit}
        onOpenChange={(open) => !open && setRoleToEdit(null)}
        currentPage={page}
      />
    </>
  );
}
