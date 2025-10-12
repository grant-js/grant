import { useMemo } from 'react';

import { useQuery } from '@apollo/client/react';
import { QueryTagsArgs, Tag, TagPage } from '@logusgraphics/grant-schema';

import { GET_TAGS } from './queries';

interface UseTagsResult {
  tags: Tag[];
  loading: boolean;
  error: Error | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useTags(params: QueryTagsArgs): UseTagsResult {
  const { scope, ids, limit, page, search, sort } = params;

  const skip = useMemo(() => !scope || !scope.id || !scope.tenant, [scope?.id, scope?.tenant]);

  const variables = useMemo(
    () => ({
      scope,
      ids,
      limit,
      page,
      search,
      sort,
    }),
    [scope?.id, scope?.tenant, ids, limit, page, search, sort?.field, sort?.order]
  );

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
