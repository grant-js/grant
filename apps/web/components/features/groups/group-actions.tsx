'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupsStore } from '@/stores/groups.store';

interface GroupActionsProps {
  group: Group;
}

export function GroupActions({ group }: GroupActionsProps) {
  const t = useTranslations('groups.actions');

  const setGroupToEdit = useGroupsStore((state) => state.setGroupToEdit);
  const setGroupToDelete = useGroupsStore((state) => state.setGroupToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.Group, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  const handleEditClick = () => {
    setGroupToEdit(group);
  };

  const handleDeleteClick = () => {
    setGroupToDelete(group);
  };

  // Build actions array based on permissions
  const actions: ActionItem<Group>[] = [];

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

  return <Actions entity={group} actions={actions} />;
}
