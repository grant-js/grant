import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';
import { Permission, PermissionPage, QueryPermissionsArgs } from '@logusgraphics/grant-schema';

import { GET_PERMISSIONS } from './queries';

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function usePermissions(options: QueryPermissionsArgs): UsePermissionsResult {
  const { scope } = options;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(() => options, [options]);

  const { data, loading, error, refetch } = useQuery<{ permissions: PermissionPage }>(
    GET_PERMISSIONS,
    {
      variables,
      skip,
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
