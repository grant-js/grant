import { useMemo } from 'react';

import { useQuery, ApolloError } from '@apollo/client';
import { Tag, QueryTagsArgs, TagPage } from '@logusgraphics/grant-schema';

import { GET_TAGS } from './queries';

interface UseTagsResult {
  tags: Tag[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useTags(params: QueryTagsArgs): UseTagsResult {
  const { scope } = params;

  const variables = useMemo(() => params, [params]);

  const skip = useMemo(() => !scope || !scope.id, [scope]);

  const { data, loading, error, refetch } = useQuery<{ tags: TagPage }>(GET_TAGS, {
    variables,
    skip,
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
