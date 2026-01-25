import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { ApiKey, ApiKeyPage, GetApiKeysDocument, QueryApiKeysArgs } from '@grantjs/schema';

interface UseApiKeysResult {
  apiKeys: ApiKey[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  hasNextPage: boolean;
  refetch: (
    variables?: Partial<QueryApiKeysArgs>
  ) => Promise<ApolloClient.QueryResult<{ apiKeys: ApiKeyPage }>>;
}

export function useApiKeys(params: QueryApiKeysArgs): UseApiKeysResult {
  const { scope, limit, page, search, sort, ids } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope,
      limit,
      page,
      search,
      sort,
      ids,
    }),
    [scope, limit, page, search, sort, ids]
  );

  const { data, loading, error, refetch } = useQuery<{ apiKeys: ApiKeyPage }>(GetApiKeysDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { apiKeys, totalCount, hasNextPage } = useMemo(
    () => ({
      apiKeys: data?.apiKeys?.apiKeys ?? [],
      totalCount: data?.apiKeys?.totalCount ?? 0,
      hasNextPage: data?.apiKeys?.hasNextPage ?? false,
    }),
    [data]
  );

  return {
    apiKeys,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch,
  };
}
