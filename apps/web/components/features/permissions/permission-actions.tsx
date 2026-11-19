'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';

import { ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionsStore } from '@/stores/permissions.store';

interface PermissionActionsProps {
  permission: Permission;
}

export function PermissionActions({ permission }: PermissionActionsProps) {
  const t = useTranslations('permissions.actions');

  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);
  const setPermissionToDelete = usePermissionsStore((state) => state.setPermissionToDelete);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const scope = useScopeFromParams();

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Permission,
    ResourceAction.Update,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Permission,
    ResourceAction.Delete,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;

  const permissionsResolved = hasBeenOpened && !isUpdateLoading && !isDeleteLoading;

  // Build actions array based on permissions
  const actions: ActionItem<Permission>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => setPermissionToEdit(permission),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setPermissionToDelete(permission),
      variant: 'destructive',
    });
  }

  const isLoading = !permissionsResolved;

  return (
    <Actions
      entity={permission}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={isLoading}
    />
  );
}
