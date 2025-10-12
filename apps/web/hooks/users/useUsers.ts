import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { QueryUsersArgs, User, UserPage } from '@logusgraphics/grant-schema';

import { GET_USERS } from './queries';

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useUsers(params: QueryUsersArgs): UseUsersResult {
  const { scope, ids, limit, page, search, sort, tagIds } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope?.id, scope?.tenant]);

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
    [scope?.id, scope?.tenant, ids, limit, page, search, sort?.field, sort?.order, tagIds]
  );

  const { data, loading, error, refetch } = useQuery<{ users: UserPage }>(GET_USERS, {
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
