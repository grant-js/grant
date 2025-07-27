'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTranslations } from 'next-intl';
import { useGroupMutations } from '@/hooks/groups';

interface DeleteGroupDialogProps {
  groupToDelete: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteGroupDialog({ groupToDelete, onOpenChange }: DeleteGroupDialogProps) {
  const t = useTranslations('groups');
  const { deleteGroup } = useGroupMutations();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!groupToDelete) return;

    try {
      setIsDeleting(true);
      await deleteGroup(groupToDelete.id, groupToDelete.name);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!groupToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('delete.description', { name: groupToDelete?.name || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t('actions.deleting') : t('actions.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
