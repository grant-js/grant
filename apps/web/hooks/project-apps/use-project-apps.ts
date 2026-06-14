import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  GetProjectAppsDocument,
  type ProjectAppPage,
  type QueryProjectAppsArgs,
} from '@grantjs/schema';

interface UseProjectAppsResult {
  projectApps: ProjectAppPage['projectApps'];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  hasNextPage: boolean;
  refetch: (
    variables?: Partial<QueryProjectAppsArgs>
  ) => Promise<ApolloClient.QueryResult<{ projectApps: ProjectAppPage }>>;
}

export function useProjectApps(params: QueryProjectAppsArgs): UseProjectAppsResult {
  const { scope, limit, page, search, sort, tagIds, ids } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope,
      limit,
      page,
      search,
      sort,
      tagIds,
      ids,
    }),
    [scope, limit, page, search, sort, tagIds, ids]
  );

  const { data, loading, error, refetch } = useQuery<{
    projectApps: ProjectAppPage;
  }>(GetProjectAppsDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { projectApps, totalCount, hasNextPage } = useMemo(
    () => ({
      projectApps: data?.projectApps?.projectApps ?? [],
      totalCount: data?.projectApps?.totalCount ?? 0,
      hasNextPage: data?.projectApps?.hasNextPage ?? false,
    }),
    [data]
  );

  return {
    projectApps,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch,
  };
}
