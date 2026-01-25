'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useUsersStore } from '@/stores/users.store';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const t = useTranslations('users.actions');

  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);
  const setUserToDelete = useUsersStore((state) => state.setUserToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.User, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.User, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  const handleEditClick = () => {
    setUserToEdit(user);
  };

  const handleDeleteClick = () => {
    setUserToDelete(user);
  };

  // Build actions array based on permissions
  const actions: ActionItem<User>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: handleEditClick,
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

  return <Actions entity={user} actions={actions} />;
}
