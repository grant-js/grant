import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Project, ProjectPage, QueryProjectsArgs } from '@grantjs/schema';
import { GetProjectsDocument } from '@grantjs/schema';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryProjectsArgs>
  ) => Promise<ApolloClient.QueryResult<{ projects: ProjectPage }>>;
}

export function useProjects(params: QueryProjectsArgs): UseProjectsResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope,
      ids,
      limit,
      page,
      search,
      sort,
      tagIds,
    }),
    [scope, ids, limit, page, search, sort, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ projects: ProjectPage }>(
    GetProjectsDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { projects, totalCount } = useMemo(
    () => ({
      projects: data?.projects?.projects ?? [],
      totalCount: data?.projects?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    projects,
    loading,
    error,
    totalCount,
    refetch,
  };
}
