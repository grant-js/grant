'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';

import { ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupsStore } from '@/stores/groups.store';

interface GroupActionsProps {
  group: Group;
}

export function GroupActions({ group }: GroupActionsProps) {
  const t = useTranslations('groups.actions');

  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);
  const setGroupToDelete = useGroupsStore((state) => state.setGroupToDelete);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  const scope = useScopeFromParams();

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Group,
    ResourceAction.Update,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.Group,
    ResourceAction.Delete,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;

  const permissionsResolved = hasBeenOpened && !isUpdateLoading && !isDeleteLoading;

  // Build actions array based on permissions
  const actions: ActionItem<Group>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => setGroupToEdit(group),
    });
  }

  if (canDelete) {
    actions.push({
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: () => setGroupToDelete(group),
      variant: 'destructive',
    });
  }

  const isLoading = !permissionsResolved;

  return (
    <Actions
      entity={group}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={isLoading}
    />
  );
}
