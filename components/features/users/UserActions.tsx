'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { User } from '@/graphql/generated/types';

interface UserActionsProps {
  user: User;
  onEditClick: (user: User) => void;
  onDeleteClick: (user: User) => void;
}

export function UserActions({ user, onEditClick, onDeleteClick }: UserActionsProps) {
  const t = useTranslations('users.actions');

  const actions: ActionItem<User>[] = [
    {
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: onEditClick,
    },
    {
      key: 'delete',
      label: t('delete'),
      icon: <Trash2 className="mr-2 h-4 w-4" />,
      onClick: onDeleteClick,
      variant: 'destructive',
    },
  ];

  return <Actions entity={user} actions={actions} />;
}
