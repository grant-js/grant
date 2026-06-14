import { useMemo } from 'react';
import { ApolloClient } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { QueryTagsArgs, Tag, TagPage } from '@grantjs/schema';
import { GetTagsDocument } from '@grantjs/schema';

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
  const { scope, ids } = params;

  const skip = useMemo(
    () => !scope || !scope.id || !scope.tenant || (ids != null && ids.length === 0),
    [scope, ids]
  );

  const variables = useMemo(() => params, [params]);

  const { data, loading, error, refetch } = useQuery<{ tags: TagPage }>(GetTagsDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { tags, totalCount } = useMemo(() => {
    const rawTags = data?.tags?.tags || [];
    const limit = params.limit;
    const cappedTags =
      limit != null && limit > 0 && rawTags.length > limit ? rawTags.slice(0, limit) : rawTags;

    return {
      tags: cappedTags,
      totalCount: data?.tags?.totalCount || 0,
    };
  }, [data, params.limit]);

  return {
    tags,
    loading,
    error,
    totalCount,
    refetch,
  };
}
