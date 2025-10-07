'use client';

import { Organization } from '@logusgraphics/grant-schema';
import { Edit, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationActionsProps {
  organization: Organization;
}

export function OrganizationActions({ organization }: OrganizationActionsProps) {
  const t = useTranslations('organizations.actions');

  // Use selective subscriptions to prevent unnecessary re-renders
  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  const handleEditClick = () => {
    setOrganizationToEdit(organization);
  };

  const handleDeleteClick = () => {
    setOrganizationToDelete({ id: organization.id, name: organization.name });
  };

  const actions: ActionItem<Organization>[] = [
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

  return <Actions entity={organization} actions={actions} />;
}
