import { useQuery, ApolloError } from '@apollo/client';

import {
  Tag,
  TagSortField,
  SortDirection,
  QueryTagsArgs,
  TagPage,
} from '@/graphql/generated/types';

import { GET_TAGS } from './queries';

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
    limit = 50,
    search = '',
    sort = { field: TagSortField.Name, direction: SortDirection.Asc },
    ids,
  } = options;

  const { data, loading, error, refetch } = useQuery<{ tags: TagPage }>(GET_TAGS, {
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
