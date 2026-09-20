import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetProjectOAuthConnectionsDocument, ProjectOAuthConnection, Scope } from '@grantjs/schema';

interface UseProjectOAuthConnectionsResult {
  connections: ProjectOAuthConnection[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<
    ApolloClient.QueryResult<{ projectOAuthConnections: ProjectOAuthConnection[] }>
  >;
}

export function useProjectOAuthConnections(
  scope: Scope | null | undefined
): UseProjectOAuthConnectionsResult {
  const skip = useMemo(() => !scope?.id || !scope?.tenant, [scope]);

  const { data, loading, error, refetch } = useQuery<{
    projectOAuthConnections: ProjectOAuthConnection[];
  }>(GetProjectOAuthConnectionsDocument, {
    variables: { scope },
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const connections = useMemo(
    () => data?.projectOAuthConnections ?? [],
    [data?.projectOAuthConnections]
  );

  return {
    connections,
    loading,
    error,
    refetch,
  };
}
