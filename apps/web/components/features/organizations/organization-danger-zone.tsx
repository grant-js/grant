'use client';

import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';

import { FeatureModuleCard } from '@/components/common/feature-module-card';
import { Button } from '@/components/ui/button';
import { useOrganizationsStore } from '@/stores/organizations.store';

interface OrganizationDangerZoneProps {
  organization: Organization;
}

export function OrganizationDangerZone({ organization }: OrganizationDangerZoneProps) {
  const t = useTranslations('organizations.settings.dangerZone');
  const setOrganizationToDelete = useOrganizationsStore((state) => state.setOrganizationToDelete);

  const { isGranted: canDelete, isLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.Delete,
    { scope: { tenant: Tenant.Organization, id: organization.id }, returnLoading: true }
  ) as UseGrantResult;

  if (isLoading || !canDelete) {
    return null;
  }

  return (
    <div data-testid="organization-danger-zone">
      <FeatureModuleCard
        title={<span className="text-destructive">{t('title')}</span>}
        description={t('description')}
        className="mx-auto max-w-2xl"
        cardClassName="border-destructive"
        collapsible
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('delete.title')}</p>
            <p className="text-sm text-muted-foreground">{t('delete.description')}</p>
          </div>
          <Button
            variant="destructive"
            onClick={() =>
              setOrganizationToDelete({ id: organization.id, name: organization.name })
            }
          >
            {t('delete.action')}
          </Button>
        </div>
      </FeatureModuleCard>
    </div>
  );
}
