'use client';

import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { Role } from '@/graphql/generated/types';
import { useRolesStore } from '@/stores/roles.store';

interface RoleActionsProps {
  role: Role;
}

export function RoleActions({ role }: RoleActionsProps) {
  const t = useTranslations('roles.actions');

  // Use selective subscriptions to prevent unnecessary re-renders
  const setRoleToEdit = useRolesStore((state) => state.setRoleToEdit);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  const handleEditClick = () => {
    setRoleToEdit(role);
  };

  const handleDeleteClick = () => {
    setRoleToDelete({ id: role.id, name: role.name });
  };

  const actions: ActionItem<Role>[] = [
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

  return <Actions entity={role} actions={actions} />;
}
