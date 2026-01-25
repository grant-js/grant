'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { useRolesStore } from '@/stores/roles.store';

export function RoleDeleteDialog() {
  const scope = useScopeFromParams();
  const { deleteRole } = useRoleMutations();
  const roleToDelete = useRolesStore((state) => state.roleToDelete);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  const canDelete = useGrant(ResourceSlug.Role, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || !canDelete) {
    return null;
  }

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
