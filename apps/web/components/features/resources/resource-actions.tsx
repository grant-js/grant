'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Resource } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useResourcesStore } from '@/stores/resources.store';

interface ResourceActionsProps {
  resource: Resource;
}

export function ResourceActions({ resource }: ResourceActionsProps) {
  const t = useTranslations('resources.actions');

  const setResourceToEdit = useResourcesStore((state) => state.setResourceToEdit);
  const setResourceToDelete = useResourcesStore((state) => state.setResourceToDelete);

  // Get scope from URL params (can be Organization, AccountProject, or OrganizationProject)
  const scope = useScopeFromParams();

  // Check permissions using the Grant client (always call hooks, pass undefined scope if not available)
  const canUpdate = useGrant(ResourceSlug.Resource, ResourceAction.Update, {
    scope: scope!,
  });
  const canDelete = useGrant(ResourceSlug.Resource, ResourceAction.Delete, {
    scope: scope!,
  });

  if (!scope || (!canUpdate && !canDelete)) {
    return null;
  }

  const handleEditClick = () => {
    setResourceToEdit(resource);
  };

  const handleDeleteClick = () => {
    setResourceToDelete(resource);
  };

  // Build actions array based on permissions
  const actions: ActionItem<Resource>[] = [];

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

  return <Actions entity={resource} actions={actions} />;
}
