import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { Project, ProjectPage, QueryProjectsArgs } from '@logusgraphics/grant-schema';

import { GET_PROJECTS } from './queries';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useProjects(params: QueryProjectsArgs): UseProjectsResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope?.id, scope?.tenant]);

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
    [scope?.id, scope?.tenant, ids, limit, page, search, sort?.field, sort?.order, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ projects: ProjectPage }>(GET_PROJECTS, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

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
