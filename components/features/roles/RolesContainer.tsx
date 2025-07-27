'use client';

import { useState, useCallback, useEffect } from 'react';
import { Role, RoleSortableField, RoleSortOrder } from '@/graphql/generated/types';
import { useRoles } from '@/hooks/roles';
import { EditRoleDialog } from './EditRoleDialog';
import { DeleteRoleDialog } from './DeleteRoleDialog';
import { RoleViewer } from './RoleViewer';
import { RoleView } from './RoleViewSwitcher';

interface RolesContainerProps {
  page: number;
  limit: number;
  search: string;
  sort?: {
    field: RoleSortableField;
    order: RoleSortOrder;
  };
  view: RoleView;
  onTotalCountChange?: (totalCount: number) => void;
}

export function RolesContainer({
  page,
  limit,
  search,
  sort,
  view,
  onTotalCountChange,
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
      <RoleViewer
        limit={limit}
        roles={roles}
        loading={loading}
        search={search}
        view={view}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
      />

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
