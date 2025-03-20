'use client';
import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { getClient } from '../lib/apollo-client';
import { useEffect, useState } from 'react';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ApolloClient<NormalizedCacheObject>>();

  useEffect(() => {
    setClient(getClient());
  }, []);

  if (!client) {
    return null;
  }

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
