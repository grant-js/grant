'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { User } from '@/graphql/generated/types';
import { useUsersStore } from '@/stores/users.store';

interface UserActionsProps {
  user: User;
}

export function UserActions({ user }: UserActionsProps) {
  const t = useTranslations('users.actions');

  // Use selective subscriptions to prevent unnecessary re-renders
  const setUserToEdit = useUsersStore((state) => state.setUserToEdit);
  const setUserToDelete = useUsersStore((state) => state.setUserToDelete);

  const handleEditClick = () => {
    setUserToEdit(user);
  };

  const handleDeleteClick = () => {
    setUserToDelete(user);
  };

  const actions: ActionItem<User>[] = [
    {
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: handleEditClick,
    },
    {
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: handleDeleteClick,
      variant: 'destructive',
    },
  ];

  return <Actions entity={user} actions={actions} />;
}
