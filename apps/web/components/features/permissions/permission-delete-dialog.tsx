'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { usePermissionsStore } from '@/stores/permissions.store';

export function PermissionDeleteDialog() {
  const scope = useScopeFromParams();
  const { deletePermission } = usePermissionMutations();
  const permissionToDelete = usePermissionsStore((state) => state.permissionToDelete);
  const setPermissionToDelete = usePermissionsStore((state) => state.setPermissionToDelete);

  const canDelete = useGrant(ResourceSlug.Permission, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || !canDelete) {
    return null;
  }

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
