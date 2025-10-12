import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import {
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@logusgraphics/grant-schema';

import { GET_ORGANIZATIONS } from './queries';

interface UseOrganizationsResult {
  organizations: Organization[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useOrganizations(options: QueryOrganizationsArgs): UseOrganizationsResult {
  const { ids, limit, page, search, sort } = options;

  const variables = useMemo(
    () => ({
      ids,
      limit,
      page,
      search,
      sort,
    }),
    [ids, limit, page, search, sort?.field, sort?.order]
  );

  const { data, loading, error, refetch } = useQuery<{ organizations: OrganizationPage }>(
    GET_ORGANIZATIONS,
    {
      variables,
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
    }
  );

  const { organizations, totalCount } = useMemo(
    () => ({
      organizations: data?.organizations?.organizations ?? [],
      totalCount: data?.organizations?.totalCount ?? 0,
    }),
    [data]
  );

  return {
    organizations,
    loading,
    error,
    totalCount,
    refetch,
  };
}
