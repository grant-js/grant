import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetUsersDocument, QueryUsersArgs, User, UserPage } from '@grantjs/schema';

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryUsersArgs>
  ) => Promise<ApolloClient.QueryResult<{ users: UserPage }>>;
}

export function useUsers(params: QueryUsersArgs): UseUsersResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

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

  const { data, loading, error, refetch } = useQuery<{ users: UserPage }>(GetUsersDocument, {
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
