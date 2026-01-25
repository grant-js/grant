'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@grantjs/schema';

export function useScopeFromParams(): Scope | null {
  const params = useParams();

  if (params.accountId && params.projectId && params.userId) {
    return {
      tenant: Tenant.AccountProjectUser,
      id: `${params.accountId}:${params.projectId}:${params.userId}` as string,
    };
  }

  if (params.organizationId && params.projectId && params.userId) {
    return {
      tenant: Tenant.OrganizationProjectUser,
      id: `${params.organizationId}:${params.projectId}:${params.userId}` as string,
    };
  }

  if (params.projectId && params.organizationId) {
    return {
      tenant: Tenant.OrganizationProject,
      id: `${params.organizationId}:${params.projectId}` as string,
    };
  }

  if (params.projectId && params.accountId) {
    return {
      tenant: Tenant.AccountProject,
      id: `${params.accountId}:${params.projectId}` as string,
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
