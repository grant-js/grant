import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Account, MeDocument, MeQuery } from '@grantjs/schema';

interface UseMeResult {
  accounts: Account[];
  /** True once a `me` response arrived, so an empty `accounts` is the server's answer. */
  loaded: boolean;
  hasOrganizationMembership: boolean;
  email: string | null;
  mfaVerified: boolean;
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

  const loaded = data?.me != null;
  const accounts = data?.me?.accounts ?? [];
  const hasOrganizationMembership = data?.me?.hasOrganizationMembership ?? false;
  const email = data?.me?.email ?? null;
  const mfaVerified = data?.me?.mfaVerified ?? false;
  const requiresEmailVerification = data?.me?.requiresEmailVerification ?? false;
  const verificationExpiry = data?.me?.verificationExpiry ?? null;

  return {
    accounts,
    loaded,
    hasOrganizationMembership,
    email,
    mfaVerified,
    requiresEmailVerification,
    verificationExpiry,
    loading,
    error: error as Error | undefined,
    refetch: async () => {
      return await refetch();
    },
  };
}
