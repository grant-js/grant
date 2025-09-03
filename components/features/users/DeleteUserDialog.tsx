'use client';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

export function DeleteUserDialog() {
  const scope = useScopeFromParams();
  const { deleteUser } = useUserMutations();

  const userToDelete = useUsersStore((state) => state.userToDelete);
  const setUserToDelete = useUsersStore((state) => state.setUserToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteUser({ id, scope }, name);
  };

  const handleSuccess = async () => {
    if (!userToDelete) {
      return;
    }
    setUserToDelete(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!userToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={userToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="users"
    />
  );
}
