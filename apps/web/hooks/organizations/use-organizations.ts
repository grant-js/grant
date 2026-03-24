import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { Organization, OrganizationPage, QueryOrganizationsArgs, Scope } from '@grantjs/schema';
import { GetOrganizationsDocument } from '@grantjs/schema';

export type UseOrganizationsParams = Omit<QueryOrganizationsArgs, 'scope'> & {
  scope?: Scope;
  skip?: boolean;
};

interface UseOrganizationsResult {
  organizations: Organization[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryOrganizationsArgs>
  ) => Promise<ApolloClient.QueryResult<{ organizations: OrganizationPage }>>;
}

export function useOrganizations(options: UseOrganizationsParams): UseOrganizationsResult {
  const { scope, ids, limit, page, search, sort, skip: skipParam } = options;

  const skip = useMemo(
    () => skipParam === true || !scope || !scope.id || !scope.tenant,
    [skipParam, scope]
  );

  const variables = useMemo(() => {
    if (skip || !scope) {
      return { scope: scope ?? ({} as Scope), ids, limit, page, search, sort };
    }
    return { scope, ids, limit, page, search, sort };
  }, [skip, scope, ids, limit, page, search, sort]);

  const { data, loading, error, refetch } = useQuery<{ organizations: OrganizationPage }>(
    GetOrganizationsDocument,
    {
      variables,
      skip,
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
