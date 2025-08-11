import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';

import { Organization, OrganizationPage, QueryOrganizationsArgs } from '@/graphql/generated/types';

import { GET_ORGANIZATIONS } from './queries';

interface UseOrganizationsResult {
  organizations: Organization[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useOrganizations(options: QueryOrganizationsArgs): UseOrganizationsResult {
  const { page, limit, search, sort, ids } = options;

  const variables = useMemo(
    () => ({
      page,
      limit,
      search,
      sort,
      ids,
    }),
    [page, limit, search, sort, ids]
  );

  const { data, loading, error, refetch } = useQuery<{ organizations: OrganizationPage }>(
    GET_ORGANIZATIONS,
    {
      variables,
    }
  );

  return {
    organizations: data?.organizations?.organizations || [],
    loading,
    error,
    totalCount: data?.organizations?.totalCount || 0,
    refetch,
  };
}
