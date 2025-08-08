import { useQuery, ApolloError } from '@apollo/client';

import { Tag, TagSortField, SortDirection, QueryTagsArgs } from '@/graphql/generated/types';

import { GET_TAGS } from './queries';

interface TagsQueryResult {
  tags: {
    tags: Tag[];
    totalCount: number;
    hasNextPage: boolean;
  };
}

interface UseTagsOptions extends Partial<QueryTagsArgs> {}

interface UseTagsResult {
  tags: Tag[];
  loading: boolean;
  error: ApolloError | undefined;
  totalCount: number;
  refetch: () => Promise<any>;
}

export function useTags(options: UseTagsOptions): UseTagsResult {
  const {
    scope,
    page = 1,
    limit = 50, // Default to 50 for pagination
    search = '',
    sort = { field: TagSortField.Name, direction: SortDirection.Asc },
    ids,
  } = options;

  const { data, loading, error, refetch } = useQuery<TagsQueryResult>(GET_TAGS, {
    variables: {
      scope,
      page,
      limit,
      search,
      sort,
      ids,
    },
  });

  return {
    tags: data?.tags?.tags || [],
    loading,
    error,
    totalCount: data?.tags?.totalCount || 0,
    refetch,
  };
}
