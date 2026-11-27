'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';
import { Edit, Settings } from 'lucide-react';

import { ActionItem, Actions } from '@/components/common';
import { useEmailVerified } from '@/hooks/auth';
import { useRouter } from '@/i18n/navigation';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationActionsProps {
  organization: Organization;
}

export function OrganizationActions({ organization }: OrganizationActionsProps) {
  const t = useTranslations('organizations.actions');

  const setOrganizationToEdit = useOrganizationsStore((state) => state.setOrganizationToEdit);
  const router = useRouter();

  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (open && !hasBeenOpened) setHasBeenOpened(true);
    },
    [hasBeenOpened]
  );

  // Scope permissions to this organization
  const scope = organization.id ? { tenant: Tenant.Organization, id: organization.id } : null;

  const { isGranted: canUpdate, isLoading: isUpdateLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.Update,
    { scope, enabled: hasBeenOpened, returnLoading: true }
  ) as UseGrantResult;

  const isEmailVerified = useEmailVerified();

  if (!isEmailVerified) return null;

  const permissionsResolved = hasBeenOpened && !isUpdateLoading;

  // Build actions array based on permissions
  const actions: ActionItem<Organization>[] = [];

  if (canUpdate) {
    actions.push({
      key: 'edit',
      label: t('edit'),
      icon: <Edit className="mr-2 h-4 w-4" />,
      onClick: () => setOrganizationToEdit(organization),
    });
  }

  actions.push({
    key: 'settings',
    label: t('settings'),
    icon: <Settings className="mr-2 h-4 w-4" />,
    onClick: () => router.push(`/dashboard/organizations/${organization.id}/settings`),
  });

  const isLoading = !permissionsResolved;

  return (
    <Actions
      entity={organization}
      actions={actions}
      onOpenChange={handleOpenChange}
      isLoading={isLoading}
    />
  );
}
