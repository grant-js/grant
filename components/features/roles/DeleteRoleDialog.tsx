'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { useRoleMutations } from '@/hooks/roles';

interface DeleteRoleDialogProps {
  roleToDelete: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteRoleDialog({ roleToDelete, onOpenChange, onSuccess }: DeleteRoleDialogProps) {
  const t = useTranslations('roles');
  const { deleteRole } = useRoleMutations();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!roleToDelete) return;

    setIsDeleting(true);
    try {
      await deleteRole(roleToDelete.id, roleToDelete.name);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in the useRoleMutations hook
      console.error('Error deleting role:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!roleToDelete} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('deleteDialog.description', { name: roleToDelete?.name || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{t('deleteDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
