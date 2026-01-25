import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetResourcesDocument, QueryResourcesArgs, Resource, ResourcePage } from '@grantjs/schema';

interface UseResourcesResult {
  resources: Resource[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  hasNextPage: boolean;
  refetch: (
    variables?: Partial<QueryResourcesArgs>
  ) => Promise<ApolloClient.QueryResult<{ resources: ResourcePage }>>;
}

export function useResources(options: QueryResourcesArgs): UseResourcesResult {
  const { scope, page, limit, search, sort, ids, tagIds, isActive } = options;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope,
      page,
      limit,
      search,
      sort,
      ids,
      tagIds,
      isActive,
    }),
    [scope, page, limit, search, sort, ids, tagIds, isActive]
  );

  const { data, loading, error, refetch } = useQuery<{ resources: ResourcePage }>(
    GetResourcesDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { resources, totalCount, hasNextPage } = useMemo(
    () => ({
      resources: data?.resources?.resources ?? [],
      totalCount: data?.resources?.totalCount ?? 0,
      hasNextPage: data?.resources?.hasNextPage ?? false,
    }),
    [data]
  );

  return {
    resources,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch,
  };
}
