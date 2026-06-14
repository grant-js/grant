import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetUsersListDocument, QueryUsersArgs, User, UserPage } from '@grantjs/schema';

interface UseUsersListResult {
  users: User[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryUsersArgs>
  ) => Promise<ApolloClient.QueryResult<{ users: UserPage }>>;
}

export function useUsersList(params: QueryUsersArgs): UseUsersListResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(
    () => !scope || !scope.id || !scope.tenant || (ids != null && ids.length === 0),
    [scope, ids]
  );

  const variables = useMemo(
    () => ({
      scope,
      ids,
      limit,
      page,
      search,
      sort,
      tagIds,
    }),
    [scope, ids, limit, page, search, sort, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ users: UserPage }>(GetUsersListDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { users, totalCount } = useMemo(
    () => ({
      users: data?.users?.users ?? [],
      totalCount: data?.users?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    users,
    loading,
    error,
    totalCount,
    refetch,
  };
}
