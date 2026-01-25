import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Account, MeDocument, MeQuery } from '@grantjs/schema';

interface UseMeResult {
  accounts: Account[];
  email: string | null;
  requiresEmailVerification: boolean;
  verificationExpiry: Date | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<ApolloClient.QueryResult<MeQuery>>;
}

export function useMe(): UseMeResult {
  const { data, loading, error, refetch } = useQuery<MeQuery>(MeDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const accounts = data?.me?.accounts ?? [];
  const email = data?.me?.email ?? null;
  const requiresEmailVerification = data?.me?.requiresEmailVerification ?? false;
  const verificationExpiry = data?.me?.verificationExpiry ?? null;

  return {
    accounts,
    email,
    requiresEmailVerification,
    verificationExpiry,
    loading,
    error: error as Error | undefined,
    refetch: async () => {
      return await refetch();
    },
  };
}
