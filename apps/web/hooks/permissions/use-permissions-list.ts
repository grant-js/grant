import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  GetPermissionsListDocument,
  Permission,
  PermissionPage,
  QueryPermissionsArgs,
} from '@grantjs/schema';

interface UsePermissionsListResult {
  permissions: Permission[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryPermissionsArgs>
  ) => Promise<ApolloClient.QueryResult<{ permissions: PermissionPage }>>;
}

export function usePermissionsList(params: QueryPermissionsArgs): UsePermissionsListResult {
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

  const { data, loading, error, refetch } = useQuery<{ permissions: PermissionPage }>(
    GetPermissionsListDocument,
    {
      variables,
      skip,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { permissions, totalCount } = useMemo(
    () => ({
      permissions: data?.permissions?.permissions ?? [],
      totalCount: data?.permissions?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    permissions,
    loading,
    error,
    totalCount,
    refetch,
  };
}
