import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';
import { Group, GroupPage, QueryGroupsArgs } from '@logusgraphics/grant-schema';

import { GET_GROUPS } from './queries';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useGroups(params: QueryGroupsArgs): UseGroupsResult {
  const { scope } = params;

  const variables = useMemo(() => params, [params]);

  const skip = useMemo(() => !scope || !scope.id, [scope]);

  const { data, loading, error, refetch } = useQuery<{ groups: GroupPage }>(GET_GROUPS, {
    variables,
    skip,
  });

  const { groups, totalCount } = useMemo(
    () => ({
      groups: data?.groups?.groups || [],
      totalCount: data?.groups?.totalCount || 0,
    }),
    [data]
  );

  return {
    groups,
    loading,
    error,
    totalCount,
    refetch,
  };
}
