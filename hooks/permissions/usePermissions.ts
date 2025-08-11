import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { Permission, PermissionPage, QueryPermissionsArgs } from '@/graphql/generated/types';

import { GET_PERMISSIONS } from './queries';

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function usePermissions(options: QueryPermissionsArgs): UsePermissionsResult {
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

  const { data, loading, error, refetch } = useQuery<{ permissions: PermissionPage }>(
    GET_PERMISSIONS,
    {
      variables,
    }
  );

  return {
    permissions: data?.permissions?.permissions || [],
    loading,
    error,
    totalCount: data?.permissions?.totalCount || 0,
    refetch,
  };
}
