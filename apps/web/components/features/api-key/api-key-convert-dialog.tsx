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

export interface ApiKeyConvertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleName: string;
  /** How many of the role's permissions the key carries after the conversion. */
  permissionCount: number;
  onConfirm: () => Promise<unknown>;
}

/** Converting a role key to scopes is one way, so it asks first; there is no toggle between the two. */
export function ApiKeyConvertDialog({
  open,
  onOpenChange,
  roleName,
  permissionCount,
  onConfirm,
}: ApiKeyConvertDialogProps) {
  const t = useTranslations('user.apiKeys.convertDialog');
  const [isConverting, setIsConverting] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (isConverting && !next) return;
    onOpenChange(next);
  };

  const handleConfirm = async (event: React.MouseEvent) => {
    // Keep the dialog open until the conversion finished.
    event.preventDefault();
    setIsConverting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The mutation hook already reported the error.
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { role: roleName, count: permissionCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>{t('oneWay')}</li>
          <li>{t('secretStays')}</li>
          <li>{t('review')}</li>
        </ul>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isConverting}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isConverting}>
            {isConverting ? t('converting') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
