import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { GetSigningKeysDocument, GetSigningKeysQuery, QuerySigningKeysArgs } from '@grantjs/schema';

type SigningKeyRow = GetSigningKeysQuery['signingKeys'][number];

interface UseSigningKeysResult {
  signingKeys: SigningKeyRow[];
  loading: boolean;
  error: Error | undefined;
  refetch: (
    variables?: Partial<QuerySigningKeysArgs>
  ) => Promise<ApolloClient.QueryResult<GetSigningKeysQuery>>;
}

export function useSigningKeys(params: QuerySigningKeysArgs): UseSigningKeysResult {
  const { scope } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(() => ({ scope }), [scope]);

  const { data, loading, error, refetch } = useQuery<GetSigningKeysQuery>(GetSigningKeysDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const signingKeys = useMemo(() => data?.signingKeys ?? [], [data]);

  return {
    signingKeys,
    loading,
    error,
    refetch,
  };
}
