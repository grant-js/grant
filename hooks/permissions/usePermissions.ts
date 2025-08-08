import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import {
  Permission,
  PermissionSortableField,
  PermissionSortOrder,
  QueryPermissionsArgs,
} from '@/graphql/generated/types';

import { GET_PERMISSIONS } from './queries';

interface UsePermissionsOptions extends Partial<QueryPermissionsArgs> {}

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function usePermissions(options: UsePermissionsOptions): UsePermissionsResult {
  const {
    scope,
    page = 1,
    limit = -1, // Default to -1 to get all permissions for dropdown
    search = '',
    sort = { field: PermissionSortableField.Name, order: PermissionSortOrder.Asc },
    ids,
    tagIds,
  } = options;

  // Memoize variables to prevent unnecessary re-renders
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

  const { data, loading, error, refetch } = useQuery(GET_PERMISSIONS, {
    variables,
    notifyOnNetworkStatusChange: false, // Prevent re-renders on network status changes
  });

  return {
    permissions: data?.permissions?.permissions || [],
    loading,
    error,
    totalCount: data?.permissions?.totalCount || 0,
    refetch,
  };
}
