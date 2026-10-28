'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import { Edit, Mail, Trash2 } from 'lucide-react';

import { ActionItem, Actions } from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useUsersStore } from '@/stores/users.store';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const t = useTranslations('users.actions');

  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);
  const setUserToDelete = useUsersStore((state) => state.setUserToDelete);
  const setUserToSetEmail = useUsersStore((state) => state.setUserToSetEmail);

  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) {
        setHasBeenOpened(true);
      }
    },
    [hasBeenOpened]
  );

  const scope = useScopeFromParams();

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.User,
    ResourceAction.Update,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canDelete, isLoading: isDeleteLoading } = useGrant(
    ResourceSlug.User,
    ResourceAction.Delete,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const { isGranted: canSetEmail, isLoading: isSetEmailLoading } = useGrant(
    ResourceSlug.ProjectUser,
    ResourceAction.SetEmail,
    { scope: scope!, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) {
    return null;
  }

  const permissionsResolved =
    hasBeenOpened && !isUpdateLoading && !isDeleteLoading && !isSetEmailLoading;
  if (permissionsResolved && !canUpdate && !canDelete && !canSetEmail) {
    return null;
  }

  const handleEditClick = () => {
    setUserToEdit(user);
  };

  const handleDeleteClick = () => {
    setUserToDelete(user);
  };

  const handleSetEmailClick = () => {
    setUserToSetEmail(user);
  };

  const actions: ActionItem<User>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: handleEditClick,
    });
  }

  if (canSetEmail) {
    actions.push({
      key: 'setEmail',
      label: t('setEmail'),
      icon: <Mail className="mr-2 h-4 w-4" />,
      onClick: handleSetEmailClick,
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

  const isLoading = hasBeenOpened && (isUpdateLoading || isDeleteLoading || isSetEmailLoading);

  return (
    <Actions
      entity={user}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={isLoading}
    />
  );
}
