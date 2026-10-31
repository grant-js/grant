'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { KeyRound } from 'lucide-react';

import { EntityCreateNavigateButton } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { isProjectApiKeyScope } from '@/lib/api-key-grants';

import { ApiKeyCreateDialog } from './api-key-create-dialog';

export interface ApiKeyCreateActionProps {
  onApiKeyCreated?: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  /** When true, the button always shows its label (e.g. as an empty-state action). */
  alwaysShowLabel?: boolean;
}

/**
 * The create entry point of an API-key list: project keys open the create view (the authorization
 * model is chosen there); the other scopes keep the dialog, since those keys carry no grant.
 */
export function ApiKeyCreateAction({ onApiKeyCreated, alwaysShowLabel }: ApiKeyCreateActionProps) {
  const t = useTranslations('user.apiKeys');
  const scope = useScopeFromParams();
  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, { scope: scope! });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope!);

  if (!scope || !canCreate || requiresEmailVerification) {
    return null;
  }

  if (isProjectApiKeyScope(scope)) {
    return (
      <EntityCreateNavigateButton
        entitySegment="api-keys"
        label={t('createDialog.trigger')}
        icon={KeyRound}
        alwaysShowLabel={alwaysShowLabel}
      />
    );
  }

  return (
    <ApiKeyCreateDialog
      onApiKeyCreated={onApiKeyCreated}
      triggerAlwaysShowLabel={alwaysShowLabel}
    />
  );
}
