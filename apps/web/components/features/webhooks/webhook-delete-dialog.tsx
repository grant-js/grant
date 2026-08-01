'use client';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';

import { DeleteDialog } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useProjectGrantContext, useScopeFromParams } from '@/hooks/common';
import { useWebhookSubscriptionMutations } from '@/hooks/webhooks';
import { useWebhooksStore } from '@/stores/webhooks.store';

export function WebhookDeleteDialog() {
  const scope = useScopeFromParams();
  const projectGrantContext = useProjectGrantContext();
  const subscriptionToDelete = useWebhooksStore((state) => state.subscriptionToDelete);
  const setSubscriptionToDelete = useWebhooksStore((state) => state.setSubscriptionToDelete);
  const refetch = useWebhooksStore((state) => state.refetch);
  const { remove } = useWebhookSubscriptionMutations(scope);

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Project,
    ResourceAction.Delete,
    {
      scope: scope!,
      context: projectGrantContext,
      enabled: !!subscriptionToDelete,
      returnLoading: true,
    }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) {
    return null;
  }

  if (!isDeleteLoading && !canDelete) {
    return null;
  }

  const entityToDelete = subscriptionToDelete
    ? { id: subscriptionToDelete.id, name: subscriptionToDelete.url }
    : null;

  const handleDelete = async (id: string, _name: string) => {
    await remove(id);
  };

  const handleSuccess = async () => {
    setSubscriptionToDelete(null);
    await refetch?.();
  };

  return (
    <DeleteDialog
      open={!!subscriptionToDelete}
      onOpenChange={(open) => !open && setSubscriptionToDelete(null)}
      entityToDelete={entityToDelete}
      title="deleteDialog.title"
      description="deleteDialog.description"
      cancelText="deleteDialog.cancel"
      confirmText="deleteDialog.confirm"
      deletingText="deleteDialog.deleting"
      onDelete={handleDelete}
      onSuccess={handleSuccess}
      translationNamespace="webhooks"
    />
  );
}
