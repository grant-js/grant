'use client';

import { useParams } from 'next/navigation';

import { Scope, Tenant } from '@/graphql/generated/types';

/**
 * Hook to extract scope from URL parameters.
 * Determines the tenant type and ID based on the current route.
 */
export function useScopeFromParams(): Scope {
  const params = useParams();

  // Check if we're in a project context
  if (params.projectId) {
    return {
      tenant: Tenant.Project,
      id: params.projectId as string,
    };
  }

  // Check if we're in an organization context
  if (params.organizationId) {
    return {
      tenant: Tenant.Organization,
      id: params.organizationId as string,
    };
  }

  // Fallback to default organization scope
  // This should only happen on the main dashboard page
  return {
    tenant: Tenant.Organization,
    id: '1', // Default organization ID
  };
}
