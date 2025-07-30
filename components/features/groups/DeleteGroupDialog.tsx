'use client';

import { DeleteDialog } from '@/components/common';
import { useGroupMutations } from '@/hooks/groups';
import { useGroupsStore } from '@/stores/groups.store';

export function DeleteGroupDialog() {
  const { deleteGroup } = useGroupMutations();

  // Use selective subscriptions to prevent unnecessary re-renders
  const groupToDelete = useGroupsStore((state) => state.groupToDelete);
  const setGroupToDelete = useGroupsStore((state) => state.setGroupToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteGroup(id, name);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setGroupToDelete(null);
    }
  };

  return (
    <DeleteDialog
      open={!!groupToDelete}
      onOpenChange={handleOpenChange}
      entityToDelete={groupToDelete}
      title="delete.title"
      description="delete.description"
      cancelText="actions.cancel"
      confirmText="actions.delete"
      deletingText="actions.deleting"
      onDelete={handleDelete}
      translationNamespace="groups"
    />
  );
}
