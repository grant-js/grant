'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { canAssignRole } from '@grantjs/constants';
import { ApiKey, Scope, Tenant } from '@grantjs/schema';
import { Ban, RefreshCw, Trash2 } from 'lucide-react';

import { type ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useMembers } from '@/hooks/members';
import { useAuthStore } from '@/stores/auth.store';

import { ApiKeyDeleteDialog } from './api-key-delete-dialog';
import { ApiKeyRevokeDialog } from './api-key-revoke-dialog';
import { ApiKeyRotateDialog } from './api-key-rotate-dialog';

export interface ApiKeyActionsProps {
  apiKey: ApiKey;
  scope: Scope;
}

export function ApiKeyActions({ apiKey, scope }: ApiKeyActionsProps) {
  const t = useTranslations('user.apiKeys.actions');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const { isGranted: canRevoke, isLoading: isRevokeLoading } = useGrant(
    ResourceSlug.ApiKey,
    ResourceAction.Revoke,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.ApiKey,
    ResourceAction.Delete,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const organizationId =
    scope.tenant === Tenant.OrganizationProject ? (scope.id.split(':')[0] ?? '') : '';
  const { members } = useMembers({
    organizationId,
    page: 1,
    limit: 50,
  });
  const { getCurrentAccount } = useAuthStore();
  const currentAccount = getCurrentAccount();
  const ownerId = currentAccount?.ownerId;

  const currentUserRoleName = useMemo(() => {
    if (!ownerId || !members.length) return null;
    const currentMember = members.find((m) => m.type === 'member' && m.user?.id === ownerId);
    return currentMember?.role?.name ?? null;
  }, [ownerId, members]);

  const canManageApiKey = useMemo(() => {
    if (scope.tenant !== Tenant.OrganizationProject) return true;
    if (!currentUserRoleName) return false;
    if (!apiKey.role?.name) return true;
    return canAssignRole(currentUserRoleName, apiKey.role.name);
  }, [scope.tenant, currentUserRoleName, apiKey.role]);

  if (requiresEmailVerification) return null;

  const permissionsResolved = hasBeenOpened && !isRevokeLoading && !isDeleteLoading;
  if (permissionsResolved && !canRevoke && !canDelete) return null;

  const handleRevokeClick = () => {
    if (apiKey.isRevoked) return;
    setRevokeDialogOpen(true);
  };

  const handleRotateClick = () => {
    if (apiKey.isRevoked) return;
    setRotateDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const actions: ActionItem<ApiKey>[] = [];

  if (!apiKey.isRevoked && canRevoke && canManageApiKey) {
    actions.push({
      key: 'rotate',
      label: t('rotate'),
      icon: <RefreshCw className="mr-2 h-4 w-4" />,
      onClick: handleRotateClick,
    });
    actions.push({
      key: 'revoke',
      label: t('revoke'),
      icon: <Ban className="mr-2 h-4 w-4" />,
      onClick: handleRevokeClick,
      variant: 'destructive',
    });
  }

  if (canDelete && canManageApiKey) {
    actions.push({
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleDeleteClick,
      variant: 'destructive',
    });
  }

  const isLoading = hasBeenOpened && (isRevokeLoading || isDeleteLoading);

  return (
    <>
      <Actions
        entity={apiKey}
        actions={actions}
        onOpenChange={handleOpenChange}
        isLoading={isLoading}
      />
      {!apiKey.isRevoked && canRevoke && canManageApiKey && (
        <>
          <ApiKeyRotateDialog
            apiKey={apiKey}
            scope={scope}
            open={rotateDialogOpen}
            onOpenChange={setRotateDialogOpen}
          />
          <ApiKeyRevokeDialog
            apiKey={apiKey}
            scope={scope}
            open={revokeDialogOpen}
            onOpenChange={setRevokeDialogOpen}
          />
        </>
      )}
      {canDelete && canManageApiKey && (
        <ApiKeyDeleteDialog
          apiKey={apiKey}
          scope={scope}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}
    </>
  );
}
