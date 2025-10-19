import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  Organization,
  OrganizationPage,
  QueryOrganizationsArgs,
} from '@logusgraphics/grant-schema';
import { GetOrganizationsDocument } from '@logusgraphics/grant-schema';

interface UseOrganizationsResult {
  organizations: Organization[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryOrganizationsArgs>
  ) => Promise<ApolloClient.QueryResult<{ organizations: OrganizationPage }>>;
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
    [ids, limit, page, search, sort]
  );

  const { data, loading, error, refetch } = useQuery<{ organizations: OrganizationPage }>(
    GetOrganizationsDocument,
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
