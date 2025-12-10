'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@logusgraphics/grant-schema';

export function useScopeFromParams(): Scope | null {
  const params = useParams();

  if (params.projectId && params.organizationId) {
    return {
      tenant: Tenant.OrganizationProject,
      id: params.projectId as string,
    };
  }

  if (params.projectId && params.accountId) {
    return {
      tenant: Tenant.AccountProject,
      id: params.projectId as string,
    };
  }

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
