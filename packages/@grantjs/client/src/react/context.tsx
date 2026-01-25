'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { GrantClient } from '../grant-client';

import type { GrantClientConfig } from '../types';

/**
 * Context for the Grant client
 */
const GrantContext = createContext<GrantClient | null>(null);

/**
 * Props for the GrantProvider component
 */
export interface GrantProviderProps {
  /**
   * Grant client configuration
   */
  config: GrantClientConfig;

  /**
   * Pre-configured GrantClient instance (alternative to config)
   * If provided, config is ignored
   */
  client?: GrantClient;

  /**
   * Child components
   */
  children: ReactNode;
}

/**
 * Provider component that makes the Grant client available to child components
 *
 * @example
 * ```tsx
 * // Option 1: Pass config
 * <GrantProvider
 *   config={{
 *     apiUrl: 'https://api.grant.com',
 *     getAccessToken: () => localStorage.getItem('accessToken'),
 *     getRefreshToken: () => localStorage.getItem('refreshToken'),
 *     onTokenRefresh: (tokens) => {
 *       localStorage.setItem('accessToken', tokens.accessToken);
 *       localStorage.setItem('refreshToken', tokens.refreshToken);
 *     },
 *     onUnauthorized: () => {
 *       window.location.href = '/login';
 *     },
 *   }}
 * >
 *   <App />
 * </GrantProvider>
 *
 * // Option 2: Pass pre-configured client
 * const grant = new GrantClient({ ... });
 * <GrantProvider client={grant}>
 *   <App />
 * </GrantProvider>
 * ```
 */
export function GrantProvider({ config, client, children }: GrantProviderProps) {
  const grantClient = useMemo(() => {
    if (client) return client;
    return new GrantClient(config);
  }, [client, config]);

  return <GrantContext.Provider value={grantClient}>{children}</GrantContext.Provider>;
}

/**
 * Hook to access the Grant client from context
 *
 * @throws Error if used outside of GrantProvider
 *
 * @example
 * ```tsx
 * const grant = useGrantClient();
 * const hasPermission = await grant.can('resource', 'action');
 * ```
 */
export function useGrantClient(): GrantClient {
  const client = useContext(GrantContext);

  if (!client) {
    throw new Error(
      'useGrantClient must be used within a GrantProvider. ' +
        'Wrap your app with <GrantProvider config={...}> to fix this error.'
    );
  }

  return client;
}

/**
 * Hook to optionally access the Grant client
 * Returns null if not in a GrantProvider context
 *
 * Use this when you want to gracefully handle missing provider
 */
export function useGrantClientOptional(): GrantClient | null {
  return useContext(GrantContext);
}
