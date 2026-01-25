import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { MyUserAuthenticationMethodsDocument, UserAuthenticationMethod } from '@grantjs/schema';

interface UseMyUserAuthenticationMethodsResult {
  authenticationMethods: UserAuthenticationMethod[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<
    ApolloClient.QueryResult<{ myUserAuthenticationMethods: UserAuthenticationMethod[] }>
  >;
}

export function useMyUserAuthenticationMethods(): UseMyUserAuthenticationMethodsResult {
  const { data, loading, error, refetch } = useQuery<{
    myUserAuthenticationMethods: UserAuthenticationMethod[];
  }>(MyUserAuthenticationMethodsDocument, {
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const authenticationMethods = useMemo(() => data?.myUserAuthenticationMethods ?? [], [data]);

  return {
    authenticationMethods,
    loading,
    error,
    refetch: async () => {
      return await refetch();
    },
  };
}
