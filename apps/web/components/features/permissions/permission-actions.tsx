'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionsStore } from '@/stores/permissions.store';

interface PermissionActionsProps {
  permission: Permission;
}

export function PermissionActions({ permission }: PermissionActionsProps) {
  const t = useTranslations('permissions.actions');

  const setPermissionToEdit = usePermissionsStore((state) => state.setPermissionToEdit);
  const setPermissionToDelete = usePermissionsStore((state) => state.setPermissionToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.Permission, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  const handleEditClick = () => {
    setPermissionToEdit(permission);
  };

  const handleDeleteClick = () => {
    setPermissionToDelete(permission);
  };

  // Build actions array based on permissions
  const actions: ActionItem<Permission>[] = [];

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

  return <Actions entity={permission} actions={actions} />;
}
