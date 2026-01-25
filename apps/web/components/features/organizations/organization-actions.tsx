'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationActionsProps {
  organization: Organization;
}

export function OrganizationActions({ organization }: OrganizationActionsProps) {
  const t = useTranslations('organizations.actions');

  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  // Scope permissions to this organization
  const scope = organization.id
    ? { tenant: Tenant.Organization, id: organization.id }
    : null;

  // Check permissions using the Grant client
  // Hook automatically waits for scope to become valid when provided
  const canUpdate = useGrant(ResourceSlug.Organization, ResourceAction.Update, { scope });
  const canDelete = useGrant(ResourceSlug.Organization, ResourceAction.Delete, { scope });

  // If user has no permissions, don't render the actions menu
  if (!canUpdate && !canDelete) {
    return null;
  }

  const handleEditClick = () => {
    setOrganizationToEdit(organization);
  };

  const handleDeleteClick = () => {
    setOrganizationToDelete({ id: organization.id, name: organization.name });
  };

  // Build actions array based on permissions
  const actions: ActionItem<Organization>[] = [];

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

  return <Actions entity={organization} actions={actions} />;
}
