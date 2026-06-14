import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetRolesListDocument, QueryRolesArgs, Role, RolePage } from '@grantjs/schema';

interface UseRolesListResult {
  roles: Role[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryRolesArgs>
  ) => Promise<ApolloClient.QueryResult<{ roles: RolePage }>>;
}

export function useRolesList(params: QueryRolesArgs): UseRolesListResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(
    () => !scope || !scope.id || !scope.tenant || (ids != null && ids.length === 0),
    [scope, ids]
  );

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

  const { data, loading, error, refetch } = useQuery<{ roles: RolePage }>(GetRolesListDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { roles, totalCount } = useMemo(
    () => ({
      roles: data?.roles?.roles ?? [],
      totalCount: data?.roles?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    roles,
    loading,
    error,
    totalCount,
    refetch,
  };
}
