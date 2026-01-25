'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRolesStore } from '@/stores/roles.store';

interface RoleActionsProps {
  role: Role;
}

export function RoleActions({ role }: RoleActionsProps) {
  const t = useTranslations('roles.actions');

  const setRoleToEdit = useRolesStore((state) => state.setRoleToEdit);
  const setRoleToDelete = useRolesStore((state) => state.setRoleToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.Role, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  const handleEditClick = () => {
    setRoleToEdit(role);
  };

  const handleDeleteClick = () => {
    setRoleToDelete(role);
  };

  // Build actions array based on permissions
  const actions: ActionItem<Role>[] = [];

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

  return <Actions entity={role} actions={actions} />;
}
