'use client';

import { useMemo } from 'react';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';

import { getClient } from '@/lib/apollo-client';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getClient(), []);

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
