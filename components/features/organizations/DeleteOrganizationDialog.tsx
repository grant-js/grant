'use client';

import { DeleteDialog } from '@/components/common';
import { useOrganizationMutations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

export function DeleteOrganizationDialog() {
  const { deleteOrganization } = useOrganizationMutations();

  const organizationToDelete = useOrganizationsStore((state) => state.organizationToDelete);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteOrganization({ id }, name);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setOrganizationToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!organizationToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={organizationToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="organizations"
    />
  );
}
