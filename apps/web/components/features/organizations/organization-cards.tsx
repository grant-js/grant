'use client';

import { useTranslations } from 'next-intl';
import { getTagBorderClasses, TagColor } from '@grantjs/constants';
import { Organization } from '@grantjs/schema';
import { Building2 } from 'lucide-react';

import { CardGrid, CardHeader } from '@/components/common';
import { useOrganizationsStore } from '@/stores/organizations.store';

import { OrganizationActions } from './organization-actions';
import { OrganizationAudit } from './organization-audit';
import { OrganizationAvatar } from './organization-avatar';
import { OrganizationCardSkeleton } from './organization-card-skeleton';
import { OrganizationCreateDialog } from './organization-create-dialog';
import { OrganizationNavigationButton } from './organization-navigation-button';

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
        icon: <Building2 />,
        title: search ? t('noSearchResults.title') : t('noOrganizations.title'),
        description: search ? t('noSearchResults.description') : t('noOrganizations.description'),
        action: search ? undefined : <OrganizationCreateDialog triggerAlwaysShowLabel />,
      }}
      skeleton={{
        component: <OrganizationCardSkeleton />,
        count: limit,
      }}
      renderHeader={(organization: Organization) => (
        <CardHeader
          avatarContent={
            <OrganizationAvatar
              organization={organization}
              size="lg"
              interactive
              className={
                organization.tags?.find((tag) => tag.isPrimary)?.color
                  ? `border-2 ${getTagBorderClasses(organization.tags.find((tag) => tag.isPrimary)?.color as TagColor)}`
                  : undefined
              }
            />
          }
          title={organization.name}
          description={organization.slug}
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
