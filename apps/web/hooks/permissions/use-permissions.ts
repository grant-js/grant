import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Permission, PermissionPage, QueryPermissionsArgs } from '@grantjs/schema';
import { GetPermissionsDocument } from '@grantjs/schema';

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryPermissionsArgs>
  ) => Promise<ApolloClient.QueryResult<{ permissions: PermissionPage }>>;
}

export function usePermissions(options: QueryPermissionsArgs): UsePermissionsResult {
  const { scope, page, limit, search, sort, tagIds } = options;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(
    () => ({
      scope,
      page,
      limit,
      search,
      sort,
      tagIds,
    }),
    [scope, page, limit, search, sort, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ permissions: PermissionPage }>(
    GetPermissionsDocument,
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
