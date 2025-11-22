import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import {
  GetUserAuthenticationMethodsDocument,
  GetUserAuthenticationMethodsInput,
  UserAuthenticationMethod,
} from '@logusgraphics/grant-schema';

interface UseUserAuthenticationMethodsResult {
  authenticationMethods: UserAuthenticationMethod[];
  loading: boolean;
  error: Error | undefined;
  refetch: (
    variables?: Partial<GetUserAuthenticationMethodsInput>
  ) => Promise<ApolloClient.QueryResult<{ userAuthenticationMethods: UserAuthenticationMethod[] }>>;
}

export function useUserAuthenticationMethods(
  userId: string,
  provider?: 'email' | 'google' | 'github'
): UseUserAuthenticationMethodsResult {
  const skip = useMemo(() => !userId, [userId]);

  const variables = useMemo(
    () => ({
      input: {
        userId,
        provider,
      },
    }),
    [userId, provider]
  );

  const { data, loading, error, refetch } = useQuery<{
    userAuthenticationMethods: UserAuthenticationMethod[];
  }>(GetUserAuthenticationMethodsDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const authenticationMethods = useMemo(() => data?.userAuthenticationMethods ?? [], [data]);

  return {
    authenticationMethods,
    loading,
    error,
    refetch: async (newVariables?: Partial<GetUserAuthenticationMethodsInput>) => {
      return refetch({
        input: {
          userId,
          provider,
          ...newVariables,
        },
      });
    },
  };
}
