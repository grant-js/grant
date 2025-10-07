'use client';

import { Permission } from '@logusgraphics/grant-schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { usePermissionsStore } from '@/stores/permissions.store';

interface PermissionActionsProps {
  permission: Permission;
}

export function PermissionActions({ permission }: PermissionActionsProps) {
  const t = useTranslations('permissions.actions');

  // Use selective subscriptions to prevent unnecessary re-renders
  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);
  const setPermissionToDelete = usePermissionsStore((state) => state.setPermissionToDelete);

  const handleEditClick = () => {
    setPermissionToEdit(permission);
  };

  const handleDeleteClick = () => {
    setPermissionToDelete(permission);
  };

  const actions: ActionItem<Permission>[] = [
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

  return <Actions entity={permission} actions={actions} />;
}
