import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import {
  Project,
  ProjectPage,
  ProjectSortableField,
  ProjectSortOrder,
  QueryProjectsArgs,
} from '@/graphql/generated/types';

import { GET_PROJECTS } from './queries';

interface UseProjectsResult {
  projects: Project[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useProjects(options: QueryProjectsArgs): UseProjectsResult {
  const {
    organizationId,
    page = 1,
    limit = 50,
    search = '',
    sort = { field: ProjectSortableField.Name, order: ProjectSortOrder.Asc },
    ids,
  } = options;

  // Memoize variables to prevent unnecessary re-renders
  const variables = useMemo(
    () => ({
      organizationId,
      page,
      limit,
      search,
      sort,
      ids,
    }),
    [organizationId, page, limit, search, sort, ids]
  );

  const { data, loading, error, refetch } = useQuery<{ projects: ProjectPage }>(GET_PROJECTS, {
    variables,
  });

  return {
    projects: data?.projects?.projects || [],
    loading,
    error,
    totalCount: data?.projects?.totalCount || 0,
    refetch,
  };
}
