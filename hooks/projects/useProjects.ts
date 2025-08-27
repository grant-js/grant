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
    tagIds,
  } = options;

  const variables = useMemo(
    () => ({
      organizationId,
      page,
      limit,
      search,
      sort,
      ids,
      tagIds,
    }),
    [organizationId, page, limit, search, sort, ids, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ projects: ProjectPage }>(GET_PROJECTS, {
    variables,
    skip: !organizationId,
  });

  return {
    projects: data?.projects?.projects || [],
    loading,
    error,
    totalCount: data?.projects?.totalCount || 0,
    refetch,
  };
}
