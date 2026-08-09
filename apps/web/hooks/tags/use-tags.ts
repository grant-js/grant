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
  hasNextPage: boolean;
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

  const variables = useMemo(
    () => ({
      scope: params.scope,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      search: params.search,
      ids: params.ids,
    }),
    [params.scope, params.page, params.limit, params.sort, params.search, params.ids]
  );

  const { data, loading, error, refetch } = useQuery<{ tags: TagPage }>(GetTagsDocument, {
    variables,
    skip,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });

  const { tags, totalCount, hasNextPage } = useMemo(() => {
    const rawTags = data?.tags?.tags || [];
    const limit = params.limit;
    const cappedTags =
      limit != null && limit > 0 && rawTags.length > limit ? rawTags.slice(0, limit) : rawTags;

    return {
      tags: cappedTags,
      totalCount: data?.tags?.totalCount || 0,
      hasNextPage: data?.tags?.hasNextPage ?? false,
    };
  }, [data, params.limit]);

  return {
    tags,
    loading,
    error,
    totalCount,
    hasNextPage,
    refetch,
  };
}
