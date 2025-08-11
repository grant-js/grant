import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { User, QueryUsersArgs, Scope, UserPage } from '@/graphql/generated/types';

import { GET_USERS } from './queries';

interface UseUsersOptions extends Partial<QueryUsersArgs> {
  scope: Scope;
}

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useUsers(options: UseUsersOptions): UseUsersResult {
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

  const { data, loading, error, refetch } = useQuery<{ users: UserPage }>(GET_USERS, {
    variables,
  });

  return {
    users: data?.users?.users || [],
    loading,
    error,
    totalCount: data?.users?.totalCount || 0,
    refetch,
  };
}
