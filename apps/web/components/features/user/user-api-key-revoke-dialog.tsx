'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope } from '@grantjs/schema';
import { Ban } from 'lucide-react';
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

interface UserApiKeyRevokeDialogProps {
  apiKey: ApiKey;
  scope: Scope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserApiKeyRevokeDialog({
  apiKey,
  scope,
  open,
  onOpenChange,
}: UserApiKeyRevokeDialogProps) {
  const t = useTranslations('user.apiKeys.revokeDialog');
  const { revokeApiKey } = useApiKeyMutations();

  const canRevoke = useGrant(ResourceSlug.ApiKey, ResourceAction.Revoke, { scope });

  if (!canRevoke) {
    return null;
  }

  const handleRevoke = async () => {
    if (apiKey.isRevoked) return;

    try {
      await revokeApiKey({ id: apiKey.id, scope });
      onOpenChange(false);
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { name: apiKey.name || apiKey.clientId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Ban className="mr-2 h-4 w-4" />
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
