'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope } from '@grantjs/schema';
import { RefreshCw } from 'lucide-react';

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
import { useApiKeysStore } from '@/stores/api-keys.store';

export interface ApiKeyRotateDialogProps {
  apiKey: ApiKey;
  scope: Scope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyRotateDialog({ apiKey, scope, open, onOpenChange }: ApiKeyRotateDialogProps) {
  const t = useTranslations('user.apiKeys.rotateDialog');
  const { rotateApiKey } = useApiKeyMutations();
  const handleApiKeyRotated = useApiKeysStore((state) => state.handleApiKeyRotated);

  const canRevoke = useGrant(ResourceSlug.ApiKey, ResourceAction.Revoke, { scope });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!canRevoke || requiresEmailVerification) {
    return null;
  }

  const handleRotate = async () => {
    if (apiKey.isRevoked) return;

    try {
      const result = await rotateApiKey({ id: apiKey.id, scope });
      if (result?.clientId && result.clientSecret) {
        handleApiKeyRotated({
          clientId: result.clientId,
          clientSecret: result.clientSecret,
        });
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error rotating API key:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t('title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('description', { name: apiKey.name || apiKey.clientId })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleRotate}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
