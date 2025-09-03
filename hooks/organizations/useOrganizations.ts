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
  const variables = useMemo(() => options, [options]);

  const { data, loading, error, refetch } = useQuery<{ organizations: OrganizationPage }>(
    GET_ORGANIZATIONS,
    { variables }
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
