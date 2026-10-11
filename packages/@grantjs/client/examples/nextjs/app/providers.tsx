'use client';

import { useMemo } from 'react';

import { GrantProvider, type GrantClientConfig } from '@grantjs/client/react';

import { getOAuthCallbackToken } from '@/lib/oauth-callback-token';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const config = useMemo<GrantClientConfig>(
    () => ({
      apiUrl: process.env.NEXT_PUBLIC_GRANT_API_URL || 'http://localhost:4000',
      frontendUrl: process.env.NEXT_PUBLIC_GRANT_FRONTEND_URL || 'http://localhost:3000',
      getAccessToken: () => {
        if (typeof window === 'undefined') return null;
        // In this example, the callback page sets the token from the OAuth redirect so useGrant/GrantGate can use it.
        // In production, return the token from your secure auth store (e.g. server session, httpOnly cookie).
        return getOAuthCallbackToken();
      },

      onUnauthorized: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      },

      cache: {
        ttl: 5 * 60 * 1000,
        prefix: 'grant',
      },
    }),
    []
  );

  return <GrantProvider config={config}>{children}</GrantProvider>;
}
