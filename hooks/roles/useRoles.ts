import { useQuery, ApolloError } from '@apollo/client';

import { RolesQueryResult } from '@/components/features/roles/types';
import { Role, RoleSortableField, RoleSortOrder, QueryRolesArgs } from '@/graphql/generated/types';

import { GET_ROLES } from './queries';

interface UseRolesOptions extends Partial<QueryRolesArgs> {}

interface UseRolesResult {
  roles: Role[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
}

export function useRoles(options: UseRolesOptions = {}): UseRolesResult {
  const {
    page = 1,
    limit = 1000, // Default to 1000 to get all roles for dropdown
    search = '',
    sort = { field: RoleSortableField.Name, order: RoleSortOrder.Asc },
    ids,
  } = options;

  const { data, loading, error } = useQuery<RolesQueryResult>(GET_ROLES, {
    variables: {
      page,
      limit,
      search,
      sort,
      ids,
    },
  });

  return {
    roles: data?.roles?.roles || [],
    loading,
    error,
    totalCount: data?.roles?.totalCount || 0,
  };
}
