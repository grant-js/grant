import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { Group, GroupPage, QueryGroupsArgs } from '@/graphql/generated/types';

import { GET_GROUPS } from './queries';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useGroups(options: QueryGroupsArgs): UseGroupsResult {
  const { scope, page, limit, search, sort, ids, tagIds } = options;

  const variables = useMemo(
    () => ({
      scope,
      page,
      limit,
      search,
      sort,
      ids,
      tagIds,
    }),
    [scope, page, limit, search, sort, ids, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ groups: GroupPage }>(GET_GROUPS, {
    variables,
  });

  return {
    groups: data?.groups?.groups || [],
    loading,
    error,
    totalCount: data?.groups?.totalCount || 0,
    refetch,
  };
}
