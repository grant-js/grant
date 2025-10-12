import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { QueryRolesArgs, Role, RolePage } from '@logusgraphics/grant-schema';

import { GET_ROLES } from './queries';

interface UseRolesResult {
  roles: Role[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useRoles(params: QueryRolesArgs): UseRolesResult {
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

  const { data, loading, error, refetch } = useQuery<{ roles: RolePage }>(GET_ROLES, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
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
