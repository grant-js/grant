'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import type { Scope, WebhookSubscription } from '@grantjs/schema';
import { RefreshCw, Trash2 } from 'lucide-react';

import { type ActionItem, Actions } from '@/components/common';
import { toast } from '@/components/ui/toast';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useProjectGrantContext } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

export interface WebhookSubscriptionActionsProps {
  subscription: WebhookSubscription;
  scope: Scope;
}

export function WebhookSubscriptionActions({
  subscription,
  scope,
}: WebhookSubscriptionActionsProps) {
  const t = useTranslations('webhooks');
  const refetch = useWebhooksStore((state) => state.refetch);
  const handleSecretRevealed = useWebhooksStore((state) => state.handleSecretRevealed);
  const setSubscriptionToDelete = useWebhooksStore((state) => state.setSubscriptionToDelete);
  const { rotateSecret } = useWebhookSubscriptionMutations(scope);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) {
        setHasBeenOpened(true);
      }
    },
    [hasBeenOpened]
  );

  const projectGrantContext = useProjectGrantContext();

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Project,
    ResourceAction.Update,
    { scope, context: projectGrantContext, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Project,
    ResourceAction.Delete,
    { scope, context: projectGrantContext, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const handleRotate = async () => {
    try {
      const result = await rotateSecret(subscription.id);
      handleSecretRevealed(result.secret);
      await refetch?.();
      toast.success(t('subscriptions.rotateSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('subscriptions.rotateError'));
    }
  };

  if (requiresEmailVerification) {
    return null;
  }

  const permissionsResolved = hasBeenOpened && !isUpdateLoading && !isDeleteLoading;

  const actions: ActionItem<WebhookSubscription>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'rotate',
      label: t('subscriptions.rotateSecret'),
      icon: <RefreshCw className="mr-2 h-4 w-4" />,
      onClick: () => void handleRotate(),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('subscriptions.delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setSubscriptionToDelete(subscription),
      variant: 'destructive',
    });
  }

  // `permissionsResolved` is the load-bearing half, and omitting it deadlocked the
  // menu: permissions are fetched only once it has been opened (`enabled:
  // hasBeenOpened`), so on first render both grants are false and `actions` is empty.
  // Returning null then removes the trigger that would set `hasBeenOpened`, so the
  // permissions are never fetched and the menu can never appear at all.
  //
  // `member-actions.tsx` guards it this way for the same reason.
  if (permissionsResolved && actions.length === 0) {
    return null;
  }

  const isLoading = hasBeenOpened && (isUpdateLoading || isDeleteLoading);

  return (
    <Actions
      entity={subscription}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={!permissionsResolved || isLoading}
    />
  );
}
