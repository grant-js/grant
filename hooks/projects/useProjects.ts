import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { Project, ProjectPage, QueryProjectsArgs } from '@/graphql/generated/types';

import { GET_PROJECTS } from './queries';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useProjects(params: QueryProjectsArgs): UseProjectsResult {
  const { scope } = params;

  const variables = useMemo(() => params, [params]);

  const skip = useMemo(() => !scope, [scope]);

  const { data, loading, error, refetch } = useQuery<{ projects: ProjectPage }>(GET_PROJECTS, {
    variables,
    skip,
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
