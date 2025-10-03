'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@/graphql/generated/types';

export function useScopeFromParams(): Scope | null {
  const params = useParams();

  if (params.accountId) {
    return {
      tenant: Tenant.Account,
      id: params.accountId as string,
    };
  }

  if (params.projectId) {
    return {
      tenant: Tenant.Project,
      id: params.projectId as string,
    };
  }

  if (params.organizationId) {
    return {
      tenant: Tenant.Organization,
      id: params.organizationId as string,
    };
  }

  return null;
}
