import { useMemo } from 'react';

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
  refetch: () => Promise<any>;
}

export function useGroups(options: UseGroupsOptions = {}): UseGroupsResult {
  const {
    page = 1,
    limit = 1000, // Default to 1000 to get all groups for dropdown
    search = '',
    sort = { field: GroupSortableField.Name, order: GroupSortOrder.Asc },
    ids,
    tagIds,
  } = options;

  // Memoize variables to prevent unnecessary re-renders
  const variables = useMemo(
    () => ({
      page,
      limit,
      search,
      sort,
      ids,
      tagIds,
    }),
    [page, limit, search, sort, ids, tagIds]
  );

  const { data, loading, error, refetch } = useQuery(GET_GROUPS, {
    variables,
    notifyOnNetworkStatusChange: false, // Prevent re-renders on network status changes
  });

  return {
    groups: data?.groups?.groups || [],
    loading,
    error,
    totalCount: data?.groups?.totalCount || 0,
    refetch,
  };
}
