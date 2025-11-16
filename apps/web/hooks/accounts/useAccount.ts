import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { Account, GetAccountsDocument, QueryAccountsArgs } from '@logusgraphics/grant-schema';

interface UseAccountResult {
  account: Account | null;
  loading: boolean;
  error: Error | undefined;
  refetch: () => void;
}

/**
 * Hook to fetch a single account by ID
 */
export function useAccount(accountId: string | null): UseAccountResult {
  const skip = useMemo(() => !accountId, [accountId]);

  const { data, loading, error, refetch } = useQuery<{ accounts: { accounts: Account[] } }>(
    GetAccountsDocument,
    {
      variables: {
        ids: accountId ? [accountId] : [],
        limit: 1,
      } as QueryAccountsArgs,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const account = useMemo(() => {
    return data?.accounts?.accounts?.[0] || null;
  }, [data]);

  return {
    account,
    loading,
    error,
    refetch,
  };
}
