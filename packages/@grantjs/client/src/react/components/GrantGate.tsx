'use client';

import type { ReactNode } from 'react';

import { useGrant, type UseGrantOptions } from '../hooks/useGrant';

/**
 * Props for the GrantGate component
 */
export interface GrantGateProps extends UseGrantOptions {
  /** The resource slug to check permission for */
  resource: string;
  /** The action to check */
  action: string;
  /** Content to render if permission is granted */
  children: ReactNode;
  /** Content to render if permission is denied (optional) */
  fallback?: ReactNode;
  /** Content to render while loading (optional) */
  loading?: ReactNode;
}

/**
 * Component that conditionally renders children based on permissions
 *
 * @example
 * ```tsx
 * // Basic usage - hide element if no permission
 * <GrantGate resource="document" action="update">
 *   <EditButton />
 * </GrantGate>
 *
 * // With fallback for denied access
 * <GrantGate
 *   resource="admin"
 *   action="access"
 *   fallback={<p>You don't have admin access</p>}
 * >
 *   <AdminPanel />
 * </GrantGate>
 *
 * // With loading state
 * <GrantGate
 *   resource="report"
 *   action="view"
 *   loading={<Spinner />}
 *   fallback={<AccessDenied />}
 * >
 *   <ReportViewer />
 * </GrantGate>
 *
 * // With scope for multi-tenant
 * <GrantGate
 *   resource="project"
 *   action="delete"
 *   scope={{ tenant: 'project', id: projectId }}
 * >
 *   <DeleteProjectButton />
 * </GrantGate>
 * ```
 */
export function GrantGate({
  resource,
  action,
  scope,
  enabled,
  useCache,
  children,
  fallback = null,
  loading = null,
}: GrantGateProps): ReactNode {
  // Build options object conditionally
  // Only include scope in options if it's not undefined (null is valid and means "wait for it")
  // This allows the hook to distinguish between "scope not provided" (undefined) vs "scope provided but null"
  const options: Parameters<typeof useGrant>[2] = {
    enabled,
    useCache,
    returnLoading: loading !== null,
  };
  
  // Only add scope to options if it's explicitly null or a valid object
  // If scope is undefined, don't include it so hook treats it as optional
  if (scope !== undefined) {
    options.scope = scope;
  }
  
  // Use loading state if loading prop is provided
  const result = useGrant(resource, action, options);

  const isGranted = typeof result === 'boolean' ? result : result.isGranted;
  const isLoading = typeof result === 'boolean' ? false : result.isLoading;

  if (isLoading && loading !== null) {
    return loading;
  }

  if (isGranted) {
    return children;
  }

  return fallback;
}
