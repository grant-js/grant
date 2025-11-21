import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Account, GetAccountsDocument, QueryAccountsArgs } from '@logusgraphics/grant-schema';

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<ApolloClient.QueryResult<{ accounts: { accounts: Account[] } }>>;
}

interface UseAccountsOptions {
  ids?: string[] | null;
}

export function useAccounts(options?: UseAccountsOptions): UseAccountsResult {
  const { ids } = options || {};

  const variables = useMemo<QueryAccountsArgs>(() => {
    if (ids && ids.length > 0) {
      return { ids };
    }
    return {};
  }, [ids]);

  const { data, loading, error, refetch } = useQuery<{ accounts: { accounts: Account[] } }>(
    GetAccountsDocument,
    {
      variables,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      skip: ids !== undefined && (!ids || ids.length === 0),
    }
  );

  const accounts = useMemo(() => {
    return data?.accounts?.accounts ?? [];
  }, [data]);

  return {
    accounts,
    loading,
    error: error as Error | undefined,
    refetch: async () => {
      return await refetch();
    },
  };
}
