'use client';

import { ReactNode, useMemo } from 'react';

import { GrantProvider as GrantProviderBase, type GrantClientConfig } from '@grantjs/client/react';

import { getApiBaseUrl } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';

interface GrantProviderProps {
  children: ReactNode;
}

/**
 * Grant authorization provider that integrates with the auth store
 * for token management and automatic refresh.
 */
export function GrantProvider({ children }: GrantProviderProps) {
  const config = useMemo<GrantClientConfig>(
    () => ({
      apiUrl: getApiBaseUrl(),

      // Token getters - read from auth store
      getAccessToken: () => useAuthStore.getState().accessToken,
      getRefreshToken: () => useAuthStore.getState().refreshToken,

      // Handle token refresh - update auth store with new tokens
      onTokenRefresh: (tokens) => {
        useAuthStore.getState().setTokens(tokens.accessToken, tokens.refreshToken);
      },

      // Handle unauthorized - clear auth and redirect to login
      onUnauthorized: () => {
        useAuthStore.getState().clearAuth();
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      },

      // Cache configuration
      cache: {
        ttl: 5 * 60 * 1000, // 5 minutes
        prefix: 'grant',
      },
    }),
    []
  );

  return <GrantProviderBase config={config}>{children}</GrantProviderBase>;
}
