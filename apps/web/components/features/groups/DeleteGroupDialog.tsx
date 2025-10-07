'use client';

import { DeleteDialog } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common/useScopeFromParams';
import { useGroupMutations } from '@/hooks/groups';
import { useGroupsStore } from '@/stores/groups.store';

export function DeleteGroupDialog() {
  const scope = useScopeFromParams();
  const { deleteGroup } = useGroupMutations();

  const groupToDelete = useGroupsStore((state) => state.groupToDelete);
  const setGroupToDelete = useGroupsStore((state) => state.setGroupToDelete);

  const handleDelete = async (id: string, name: string) => {
    await deleteGroup({ id, scope: scope! }, name);
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
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      translationNamespace="groups"
    />
  );
}
