import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { Permission, PermissionPage, QueryPermissionsArgs } from '@logusgraphics/grant-schema';

import { GET_PERMISSIONS } from './queries';

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function usePermissions(options: QueryPermissionsArgs): UsePermissionsResult {
  const { scope, page, limit, search, sort, tagIds } = options;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope?.id, scope?.tenant]);

  const variables = useMemo(
    () => ({
      scope,
      page,
      limit,
      search,
      sort,
      tagIds,
    }),
    [scope?.id, scope?.tenant, page, limit, search, sort?.field, sort?.order, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ permissions: PermissionPage }>(
    GET_PERMISSIONS,
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
