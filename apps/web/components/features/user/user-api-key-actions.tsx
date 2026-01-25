'use client';

import { useState } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { ApiKey, Scope } from '@grantjs/schema';
import { Ban, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, type ActionItem } from '@/components/common';

import { UserApiKeyDeleteDialog } from './user-api-key-delete-dialog';
import { UserApiKeyRevokeDialog } from './user-api-key-revoke-dialog';

interface UserApiKeyActionsProps {
  apiKey: ApiKey;
  scope: Scope;
}

export function UserApiKeyActions({ apiKey, scope }: UserApiKeyActionsProps) {
  const t = useTranslations('user.apiKeys.actions');
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check permissions using the Grant client
  const canRevoke = useGrant(ResourceSlug.ApiKey, ResourceAction.Revoke, { scope });
  const canDelete = useGrant(ResourceSlug.ApiKey, ResourceAction.Delete, { scope });

  // If user has no permissions, don't render the actions menu
  if (!canRevoke && !canDelete) {
    return null;
  }

  const handleRevokeClick = () => {
    if (apiKey.isRevoked) return;
    setRevokeDialogOpen(true);
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  // Build actions array based on permissions
  const actions: ActionItem<ApiKey>[] = [];

  if (!apiKey.isRevoked && canRevoke) {
    actions.push({
      key: 'revoke',
      label: t('revoke'),
      icon: <Ban className="mr-2 h-4 w-4" />,
      onClick: handleRevokeClick,
      variant: 'destructive',
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleDeleteClick,
      variant: 'destructive',
    });
  }

  return (
    <>
      <Actions entity={apiKey} actions={actions} />
      {!apiKey.isRevoked && canRevoke && (
        <UserApiKeyRevokeDialog
          apiKey={apiKey}
          scope={scope}
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
        />
      )}
      {canDelete && (
        <UserApiKeyDeleteDialog
          apiKey={apiKey}
          scope={scope}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
      )}
    </>
  );
}
