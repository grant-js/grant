'use client';

import { TagColor } from '@logusgraphics/grant-constants';
import { Organization } from '@logusgraphics/grant-schema';
import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CardGrid, CardHeader } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { CreateOrganizationDialog } from './CreateOrganizationDialog';
import { OrganizationActions } from './OrganizationActions';
import { OrganizationAudit } from './OrganizationAudit';
import { OrganizationCardSkeleton } from './OrganizationCardSkeleton';
import { OrganizationNavigationButton } from './OrganizationNavigationButton';

export function OrganizationCards() {
  const t = useTranslations('organizations');

  const limit = useOrganizationsStore((state) => state.limit);
  const search = useOrganizationsStore((state) => state.search);
  const organizations = useOrganizationsStore((state) => state.organizations);
  const loading = useOrganizationsStore((state) => state.loading);

  return (
    <CardGrid<Organization>
      entities={organizations}
      loading={loading}
      emptyState={{
        icon: Building2,
        title: search ? t('noSearchResults.title') : t('noOrganizations.title'),
        description: search ? t('noSearchResults.description') : t('noOrganizations.description'),
        action: search ? undefined : <CreateOrganizationDialog />,
      }}
      skeleton={{
        component: <OrganizationCardSkeleton />,
        count: limit,
      }}
      renderHeader={(organization: Organization) => (
        <CardHeader
          avatar={{
            initial: organization.name.charAt(0),
            size: 'lg',
          }}
          title={organization.name}
          description={organization.slug}
          color={organization.tags?.find((tag) => tag.isPrimary)?.color as TagColor}
          actions={<OrganizationActions organization={organization} />}
        />
      )}
      renderFooter={(organization: Organization) => (
        <div className="flex items-center justify-between w-full">
          <OrganizationAudit organization={organization} />
          <OrganizationNavigationButton organization={organization} size="lg" round={true} />
        </div>
      )}
    />
  );
}
