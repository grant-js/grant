'use client';

import { DeleteDialog } from '@/components/common';
import { useRoleMutations } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

export function DeleteRoleDialog() {
  const { deleteRole } = useRoleMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const roleToDelete = useRolesStore((state) => state.roleToDelete);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteRole(id, name);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setRoleToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!roleToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={roleToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="roles"
    />
  );
}
