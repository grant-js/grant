import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { User, QueryUsersArgs, UserPage } from '@/graphql/generated/types';

import { GET_USERS } from './queries';

interface UseUsersResult {
  users: User[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useUsers(params: QueryUsersArgs): UseUsersResult {
  const { scope } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(() => params, [params]);

  const { data, loading, error, refetch } = useQuery<{ users: UserPage }>(GET_USERS, {
    variables,
    skip,
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
