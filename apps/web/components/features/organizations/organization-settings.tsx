'use client';

import { useParams } from 'next/navigation';
import { OrganizationSortableField, SortOrder } from '@grantjs/schema';

import { Skeleton } from '@/components/ui/skeleton';
import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizations } from '@/hooks/organizations';

import { OrganizationDangerZone } from './organization-danger-zone';
import { OrganizationSecuritySettings } from './organization-security-settings';

export function OrganizationSettings() {
  const params = useParams();
  const scope = useAccountScope();
  const organizationId = params?.organizationId as string | undefined;

  const { organizations, loading } = useOrganizations({
    scope: scope!,
    ids: organizationId ? [organizationId] : [],
    limit: 1,
    sort: { field: OrganizationSortableField.Name, order: SortOrder.Asc },
    skip: !scope || !organizationId,
  });

  const organization = organizations.find((org) => org.id === organizationId);

  if (!organization) {
    return loading ? (
      <div className="space-y-6" data-testid="organization-settings-loading">
        <Skeleton className="h-40 max-w-2xl" />
      </div>
    ) : null;
  }

  return (
    <div className="space-y-6">
      <OrganizationSecuritySettings organization={organization} />
      <OrganizationDangerZone organization={organization} />
    </div>
  );
}
