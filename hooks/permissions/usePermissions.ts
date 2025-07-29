import { useQuery } from '@apollo/client';

import {
  Permission,
  PermissionSortableField,
  PermissionSortOrder,
} from '@/graphql/generated/types';

import { GET_PERMISSIONS } from './queries';

interface UsePermissionsOptions {
  page?: number;
  limit?: number;
  search?: string;
  sort?: {
    field: PermissionSortableField;
    order: PermissionSortOrder;
  };
  ids?: string[];
}

interface UsePermissionsResult {
  permissions: Permission[];
  loading: boolean;
  error: any;
  totalCount: number;
}

export function usePermissions(options: UsePermissionsOptions = {}): UsePermissionsResult {
  const {
    page = 1,
    limit = 1000, // Default to 1000 to get all permissions for dropdown
    search = '',
    sort = { field: PermissionSortableField.Name, order: PermissionSortOrder.Asc },
    ids,
  } = options;

  const { data, loading, error } = useQuery(GET_PERMISSIONS, {
    variables: {
      page,
      limit,
      search,
      sort,
      ids,
    },
  });

  return {
    permissions: data?.permissions?.permissions || [],
    loading,
    error,
    totalCount: data?.permissions?.totalCount || 0,
  };
}
