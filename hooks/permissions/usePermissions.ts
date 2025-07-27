import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';
import {
  Permission,
  PermissionSortableField,
  PermissionSortOrder,
} from '@/graphql/generated/types';

export const GET_PERMISSIONS = gql`
  query GetPermissions(
    $page: Int!
    $limit: Int!
    $sort: PermissionSortInput
    $search: String
    $ids: [ID!]
  ) {
    permissions(page: $page, limit: $limit, sort: $sort, search: $search, ids: $ids) {
      permissions {
        id
        name
        action
        description
      }
      totalCount
      hasNextPage
    }
  }
`;

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
