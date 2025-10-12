import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { Group, GroupPage, QueryGroupsArgs } from '@logusgraphics/grant-schema';

import { GET_GROUPS } from './queries';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useGroups(params: QueryGroupsArgs): UseGroupsResult {
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

  const { data, loading, error, refetch } = useQuery<{ groups: GroupPage }>(GET_GROUPS, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
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
