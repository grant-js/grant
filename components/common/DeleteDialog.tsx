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

// Generic types for the dialog
export interface DeleteDialogEntity {
  id: string;
  name: string;
}

export interface DeleteDialogProps {
  // Dialog props
  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  // Entity to delete
  entityToDelete: DeleteDialogEntity | null;

  // Content
  title: string;
  description: string;
  cancelText: string;
  confirmText: string;
  deletingText: string;

  // Actions
  onDelete: (entityId: string, entityName: string) => Promise<void>;
  onSuccess?: () => void | Promise<void>;

  // Translation namespace
  translationNamespace: string;
}

export function DeleteDialog({
  open,
  onOpenChange,
  entityToDelete,
  title,
  description,
  cancelText,
  confirmText,
  deletingText,
  onDelete,
  onSuccess,
  translationNamespace,
}: DeleteDialogProps) {
  const t = useTranslations(translationNamespace);

  // Internal state for uncontrolled usage and loading state
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : !!entityToDelete;
  const setDialogOpen = isControlled ? onOpenChange : () => {};

  const handleDelete = async () => {
    if (!entityToDelete) return;

    setInternalIsDeleting(true);
    try {
      await onDelete(entityToDelete.id, entityToDelete.name);
      // Wait for onSuccess to complete if it's async
      if (onSuccess) {
        await onSuccess();
      }
      setDialogOpen(false);
    } catch (error) {
      // Error handling is done in the specific mutation hooks
      console.error('Error deleting entity:', error);
    } finally {
      setInternalIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(title)}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(description, { name: entityToDelete?.name || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={internalIsDeleting}>{t(cancelText)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={internalIsDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {internalIsDeleting ? t(deletingText) : t(confirmText)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
