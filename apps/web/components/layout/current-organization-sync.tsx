'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { OrganizationSortableField, SortOrder } from '@grantjs/schema';

import { useAccountScope } from '@/hooks/common/use-account-scope';
import { useOrganizations } from '@/hooks/organizations';
import { useOrganizationsStore } from '@/stores/organizations.store';

/**
 * Keeps organizationsStore.currentOrganization in sync with the URL on organization routes.
 * Mounted in the dashboard layout (always visible) so the breadcrumb has the organization
 * name even when the sidebar is collapsed (e.g. on mobile) and OrganizationSwitcher is
 * unmounted.
 */
export function CurrentOrganizationSync() {
  const params = useParams();
  const scope = useAccountScope();
  const organizationId = params?.organizationId as string | undefined;
  const setCurrentOrganization = useOrganizationsStore((state) => state.setCurrentOrganization);

  const { organizations } = useOrganizations({
    scope: scope!,
    ids: organizationId ? [organizationId] : [],
    limit: 1,
    sort: { field: OrganizationSortableField.Name, order: SortOrder.Asc },
    skip: !scope || !organizationId,
  });

  const organization = organizationId ? (organizations[0] ?? null) : null;

  useEffect(() => {
    setCurrentOrganization(organization);
    return () => {
      setCurrentOrganization(null);
    };
  }, [organization, setCurrentOrganization]);

  return null;
}
