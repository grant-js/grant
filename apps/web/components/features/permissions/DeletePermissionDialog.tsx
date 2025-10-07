'use client';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { usePermissionMutations } from '@/hooks/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

export function DeletePermissionDialog() {
  const scope = useScopeFromParams();
  const { deletePermission } = usePermissionMutations();

  const permissionToDelete = usePermissionsStore((state) => state.permissionToDelete);
  const setPermissionToDelete = usePermissionsStore((state) => state.setPermissionToDelete);

  const handleDelete = async (id: string, _name: string) => {
    await deletePermission({ id, scope: scope! });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPermissionToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!permissionToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={permissionToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="permissions"
    />
  );
}
