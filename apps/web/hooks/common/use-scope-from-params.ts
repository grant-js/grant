'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Scope, Tenant } from '@grantjs/schema';

/** Static create-route segments that share a URL level with `[entityId]` dynamic routes. */
const RESERVED_ENTITY_ROUTE_SEGMENTS = new Set(['new']);

/** Normalize Next dynamic segment (string | string[] | undefined) to a single string. */
function segment(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function entityRouteSegment(value: string | string[] | undefined): string | undefined {
  const normalized = segment(value);
  if (normalized == null || RESERVED_ENTITY_ROUTE_SEGMENTS.has(normalized)) {
    return undefined;
  }
  return normalized;
}

/**
 * Derives the API `Scope` from the current route params. The returned object
 * is **referentially stable** while route params are unchanged so Apollo
 * `variables` do not change every render (which would re-fire queries).
 */
export function useScopeFromParams(): Scope | null {
  const params = useParams();

  const accountId = segment(params.accountId as string | string[] | undefined);
  const organizationId = segment(params.organizationId as string | string[] | undefined);
  const projectId = segment(params.projectId as string | string[] | undefined);
  const userId = entityRouteSegment(params.userId as string | string[] | undefined);

  return useMemo(() => {
    if (accountId && projectId && userId) {
      return {
        tenant: Tenant.AccountProjectUser,
        id: `${accountId}:${projectId}:${userId}`,
      };
    }

    if (organizationId && projectId && userId) {
      return {
        tenant: Tenant.OrganizationProjectUser,
        id: `${organizationId}:${projectId}:${userId}`,
      };
    }

    if (projectId && organizationId) {
      return {
        tenant: Tenant.OrganizationProject,
        id: `${organizationId}:${projectId}`,
      };
    }

    if (projectId && accountId) {
      return {
        tenant: Tenant.AccountProject,
        id: `${accountId}:${projectId}`,
      };
    }

    if (organizationId) {
      return {
        tenant: Tenant.Organization,
        id: organizationId,
      };
    }

    if (accountId) {
      return {
        tenant: Tenant.Account,
        id: accountId,
      };
    }

    return null;
  }, [accountId, organizationId, projectId, userId]);
}
