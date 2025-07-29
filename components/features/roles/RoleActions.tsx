'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { Role } from '@/graphql/generated/types';

interface RoleActionsProps {
  role: Role;
  onEditClick: (role: Role) => void;
  onDeleteClick: (role: Role) => void;
}

export function RoleActions({ role, onEditClick, onDeleteClick }: RoleActionsProps) {
  const t = useTranslations('roles.actions');

  const actions: ActionItem<Role>[] = [
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

  return <Actions entity={role} actions={actions} />;
}
