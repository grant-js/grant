import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Group, GroupPage, QueryGroupsArgs } from '@logusgraphics/grant-schema';
import { GetGroupsDocument } from '@logusgraphics/grant-schema';

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryGroupsArgs>
  ) => Promise<ApolloClient.QueryResult<{ groups: GroupPage }>>;
}

export function useGroups(params: QueryGroupsArgs): UseGroupsResult {
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

  const { data, loading, error, refetch } = useQuery<{ groups: GroupPage }>(GetGroupsDocument, {
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
