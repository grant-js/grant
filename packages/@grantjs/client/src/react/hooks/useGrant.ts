'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { useGrantClient } from '../context';

import type { AuthorizationResult, Scope } from '../../types';

/**
 * Options for the useGrant hook
 */
export interface UseGrantOptions {
  /** Scope to check the permission in. If provided but null/undefined, hook waits for it to become valid. */
  scope?: Scope | null;
  /** Whether to skip the permission check */
  enabled?: boolean;
  /** Whether to use cached results (default: true) */
  useCache?: boolean;
  /** Whether to return loading state (default: false) */
  returnLoading?: boolean;
}

/**
 * Result when returnLoading is true
 */
export interface UseGrantResult {
  /** Whether the user is granted permission */
  isGranted: boolean;
  /** Whether the permission check is loading */
  isLoading: boolean;
}

/**
 * Serialize scope for stable dependency comparison
 * This prevents re-fetching when scope object reference changes but values are the same
 */
function serializeScope(scope?: Scope | null): string {
  if (!scope) return '';
  return `${scope.tenant}:${scope.id}`;
}

/**
 * Hook to check if a user is granted permission for a specific resource and action
 *
 * By default, returns a simple boolean, defaulting to false while loading.
 * Set `returnLoading: true` to get an object with `isGranted` and `isLoading`.
 *
 * @param resource - The resource slug to check
 * @param action - The action to check
 * @param options - Additional options
 *
 * @example
 * ```tsx
 * // Simple boolean (default)
 * const canEdit = useGrant('document', 'update');
 *
 * return (
 *   <div>
 *     {canEdit && <EditButton />}
 *   </div>
 * );
 *
 * // With loading state
 * const { isGranted, isLoading } = useGrant('document', 'update', {
 *   returnLoading: true,
 * });
 *
 * if (isLoading) return <Spinner />;
 * if (!isGranted) return null;
 *
 * return <EditButton />;
 * ```
 */
export function useGrant(
  resource: string,
  action: string,
  options: UseGrantOptions = {}
): boolean | UseGrantResult {
  const { scope, enabled = true, useCache = true, returnLoading = false } = options;
  const client = useGrantClient();

  // Track if scope was explicitly provided (even if null/undefined)
  // This allows us to distinguish between "scope not provided" (optional) vs "scope provided but falsy" (wait for it)
  // Check this once at the start - if scope key exists in options, it was provided
  // Note: { scope: undefined } has the key, { } does not have the key
  const scopeWasProvidedRef = useRef('scope' in options);
  
  // Determine if we should wait for scope to become valid
  // If scope was provided but is falsy or invalid, wait for it to become truthy
  // Recalculate when scope changes
  const isEffectivelyEnabled = useMemo(() => {
    const hasValidScope =
      scope && typeof scope === 'object' && 'tenant' in scope && 'id' in scope && scope.id;
    const shouldWaitForScope = scopeWasProvidedRef.current && !hasValidScope;
    return enabled && !shouldWaitForScope;
  }, [scope, enabled]);

  const [data, setData] = useState<AuthorizationResult | null>(null);
  const [isLoading, setIsLoading] = useState(isEffectivelyEnabled);

  // Track mounted state to prevent state updates after unmount
  const isMounted = useRef(true);

  // Store scope in a ref so we always have the latest value without triggering re-renders
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  // Serialize scope to get a stable string for dependency comparison
  const scopeKey = serializeScope(scope);

  const fetchPermission = useCallback(async () => {
    if (!isEffectivelyEnabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Use scopeRef.current to get the latest scope value
      // Convert null to undefined for the client (which expects Scope | undefined)
      const result = await client.isAuthorized(resource, action, {
        scope: scopeRef.current ?? undefined,
        useCache,
      });
      if (isMounted.current) {
        setData(result);
      }
    } catch {
      // On error, set data to null (will return false)
      if (isMounted.current) {
        setData(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
    // Use scopeKey instead of scope for stable dependency comparison
    // isEffectivelyEnabled is included to re-run when scope becomes valid
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, resource, action, scopeKey, isEffectivelyEnabled, useCache]);

  useEffect(() => {
    isMounted.current = true;
    
    // Clear data when scope becomes invalid (waiting for valid scope)
    if (!isEffectivelyEnabled && scopeWasProvidedRef.current) {
      setData(null);
      setIsLoading(false);
    } else {
      fetchPermission();
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchPermission, isEffectivelyEnabled]);

  const isGranted = data?.authorized ?? false;

  // Return object with loading state if requested, otherwise just boolean
  if (returnLoading) {
    return { isGranted, isLoading };
  }

  return isGranted;
}
