'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@grantjs/schema';

export function useProjectScope(): Scope | null {
  const params = useParams();

  if (params.organizationId) {
    return {
      tenant: Tenant.Organization,
      id: params.organizationId as string,
    };
  }

  if (params.accountId) {
    return {
      tenant: Tenant.Account,
      id: params.accountId as string,
    };
  }

  return null;
}
