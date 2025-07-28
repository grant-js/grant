'use client';

import { useTranslations } from 'next-intl';
import { useGroupMutations } from '@/hooks/groups';
import { DeleteDialog } from '@/components/common';

interface DeleteGroupDialogProps {
  groupToDelete: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGroupDialog({ groupToDelete, onOpenChange }: DeleteGroupDialogProps) {
  const t = useTranslations('groups');
  const { deleteGroup } = useGroupMutations();

  const handleDelete = async (id: string, name: string) => {
    await deleteGroup(id, name);
  };

  return (
    <DeleteDialog
      open={!!groupToDelete}
      onOpenChange={onOpenChange}
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
