import { useMemo } from 'react';

import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { QueryTagsArgs, Tag, TagPage } from '@logusgraphics/grant-schema';

import { GET_TAGS } from './queries';

interface UseTagsResult {
  tags: Tag[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: (
    variables?: Partial<QueryTagsArgs>
  ) => Promise<ApolloClient.QueryResult<{ tags: TagPage }>>;
}

export function useTags(params: QueryTagsArgs): UseTagsResult {
  const { scope } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope]);

  const variables = useMemo(() => params, [params]);

  const { data, loading, error, refetch } = useQuery<{ tags: TagPage }>(GET_TAGS, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { tags, totalCount } = useMemo(
    () => ({
      tags: data?.tags?.tags || [],
      totalCount: data?.tags?.totalCount || 0,
    }),
    [data]
  );

  return {
    tags,
    loading,
    error,
    totalCount,
    refetch,
  };
}
