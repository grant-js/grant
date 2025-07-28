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
  onSuccess?: () => void;

  // Translation namespace
  translationNamespace: string;

  // Loading state
  isDeleting?: boolean;
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
  isDeleting: externalIsDeleting,
}: DeleteDialogProps) {
  const t = useTranslations(translationNamespace);

  // Internal state for uncontrolled usage
  const [internalIsDeleting, setInternalIsDeleting] = useState(false);

  // Use provided props or internal state
  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : !!entityToDelete;
  const setDialogOpen = isControlled ? onOpenChange : () => {};
  const isDeleting = externalIsDeleting !== undefined ? externalIsDeleting : internalIsDeleting;

  const handleDelete = async () => {
    if (!entityToDelete) return;

    const setIsDeleting = externalIsDeleting !== undefined ? () => {} : setInternalIsDeleting;

    setIsDeleting(true);
    try {
      await onDelete(entityToDelete.id, entityToDelete.name);
      onSuccess?.();
      setDialogOpen(false);
    } catch (error) {
      // Error handling is done in the specific mutation hooks
      console.error('Error deleting entity:', error);
    } finally {
      setIsDeleting(false);
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
          <AlertDialogCancel disabled={isDeleting}>{t(cancelText)}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? t(deletingText) : t(confirmText)}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
