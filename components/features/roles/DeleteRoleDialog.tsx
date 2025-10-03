'use client';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useRoleMutations } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

export function DeleteRoleDialog() {
  const scope = useScopeFromParams();
  const { deleteRole } = useRoleMutations();

  const roleToDelete = useRolesStore((state) => state.roleToDelete);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteRole({ id, scope: scope! }, name);
  };

  const handleSuccess = async () => {
    if (!roleToDelete) {
      return;
    }
    setRoleToDelete(null);
  };

  return (
    <DeleteDialog
      open={!!roleToDelete}
      onOpenChange={(open) => !open && setRoleToDelete(null)}
      entityToDelete={roleToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="roles"
    />
  );
}
