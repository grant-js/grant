import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { Role, QueryRolesArgs, RolePage } from '@/graphql/generated/types';

import { GET_ROLES } from './queries';

interface UseRolesResult {
  roles: Role[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useRoles(params: QueryRolesArgs): UseRolesResult {
  const { scope } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(() => params, [params]);

  const { data, loading, error, refetch } = useQuery<{ roles: RolePage }>(GET_ROLES, {
    variables,
    skip,
  });

  const { roles, totalCount } = useMemo(
    () => ({
      roles: data?.roles?.roles ?? [],
      totalCount: data?.roles?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    roles,
    loading,
    error,
    totalCount,
    refetch,
  };
}
