import { useQuery, ApolloError } from '@apollo/client';

import {
  Group,
  GroupSortableField,
  GroupSortOrder,
  QueryGroupsArgs,
} from '@/graphql/generated/types';

import { GET_GROUPS } from './queries';

interface UseGroupsOptions extends Partial<QueryGroupsArgs> {}

interface UseGroupsResult {
  groups: Group[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsResult {
  const {
    page = 1,
    limit = 1000, // Default to 1000 to get all groups for dropdown
    search = '',
    sort = { field: GroupSortableField.Name, order: GroupSortOrder.Asc },
    ids,
  } = options;

  const { data, loading, error } = useQuery(GET_GROUPS, {
    variables: {
      page,
      limit,
      search,
      sort,
      ids,
    },
  });

  return {
    groups: data?.groups?.groups || [],
    loading,
    error,
    totalCount: data?.groups?.totalCount || 0,
  };
}
