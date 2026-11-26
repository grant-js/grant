'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Organization, Tenant } from '@grantjs/schema';

import { FeatureModuleCard } from '@/components/common/feature-module-card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrganizationMutations } from '@/hooks/organizations';

interface OrganizationSecuritySettingsProps {
  organization: Organization;
}

export function OrganizationSecuritySettings({ organization }: OrganizationSecuritySettingsProps) {
  const t = useTranslations('organizations.settings.security');
  const { updateOrganization } = useOrganizationMutations();
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const scope = { tenant: Tenant.Organization, id: organization.id };

  const { isGranted: canUpdate, isLoading } = useGrant(
    ResourceSlug.Organization,
    ResourceAction.Update,
    { scope, returnLoading: true }
  ) as UseGrantResult;

  const checked = pendingValue ?? organization.requireMfaForSensitiveActions ?? false;
  const disabled = isLoading || !canUpdate || pendingValue !== null;

  const handleChange = async (value: boolean) => {
    setPendingValue(value);
    try {
      await updateOrganization(organization.id, {
        scope,
        requireMfaForSensitiveActions: value,
      });
    } catch {
      // The mutation hook already reported the failure; the switch falls back to the saved value.
    } finally {
      setPendingValue(null);
    }
  };

  return (
    <FeatureModuleCard title={t('title')} description={t('description')} className="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="organization-require-mfa">{t('requireMfa.label')}</Label>
          <p className="text-sm text-muted-foreground">{t('requireMfa.description')}</p>
          {!isLoading && !canUpdate && (
            <p className="text-sm text-muted-foreground">{t('readOnlyHint')}</p>
          )}
        </div>
        <Switch
          id="organization-require-mfa"
          checked={checked}
          disabled={disabled}
          onCheckedChange={handleChange}
        />
      </div>
    </FeatureModuleCard>
  );
}
