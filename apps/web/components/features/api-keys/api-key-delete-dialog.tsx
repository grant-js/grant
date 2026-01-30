'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope } from '@grantjs/schema';
import { Trash2 } from 'lucide-react';
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
import { useApiKeyMutations } from '@/hooks/api-keys';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';

export interface ApiKeyDeleteDialogProps {
  apiKey: ApiKey;
  scope: Scope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyDeleteDialog({ apiKey, scope, open, onOpenChange }: ApiKeyDeleteDialogProps) {
  const t = useTranslations('user.apiKeys.deleteDialog');
  const { deleteApiKey } = useApiKeyMutations();

  const canDelete = useGrant(ResourceSlug.ApiKey, ResourceAction.Delete, { scope });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!canDelete || requiresEmailVerification) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deleteApiKey({ id: apiKey.id, scope });
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { name: apiKey.name || apiKey.clientId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
